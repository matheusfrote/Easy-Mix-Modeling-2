import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  TenantRepository,
  DatasetRepository,
  ModelExecutionRepository,
  BudgetScenarioRepository,
  IntegrationCredentialRepository,
  AuditLogRepository
} from './tenantRepository';
import { prisma } from './prismaClient';

vi.mock('./prismaClient', () => {
  return {
    prisma: {
      tenant: {
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn()
      },
      membership: {
        updateMany: vi.fn()
      },
      dataset: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        updateMany: vi.fn()
      },
      modelExecution: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        updateMany: vi.fn()
      },
      modelResult: {
        create: vi.fn(),
        updateMany: vi.fn()
      },
      budgetScenario: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        updateMany: vi.fn()
      },
      integrationCredential: {
        findFirst: vi.fn(),
        upsert: vi.fn(),
        updateMany: vi.fn()
      },
      auditLog: {
        create: vi.fn(),
        deleteMany: vi.fn()
      },
      $transaction: vi.fn((cbOrArray) => {
        if (Array.isArray(cbOrArray)) return Promise.all(cbOrArray);
        return cbOrArray(prisma);
      })
    }
  };
});

describe('Phase 2: Multi-Tenant Architecture & Data Repositories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('DatasetRepository - Strict Tenant Isolation', () => {
    it('queries datasets filtered strictly by tenantId and ignores soft-deleted items', async () => {
      const mockDataset = {
        id: 'ds_123',
        tenantId: 'tenant_alpha',
        name: 'Alpha Data.csv',
        filename: 'alpha.csv',
        rowCount: 50,
        columnCount: 4,
        deletedAt: null
      };

      (prisma.dataset.findFirst as any).mockResolvedValue(mockDataset);

      const result = await DatasetRepository.findForTenant('tenant_alpha', 'ds_123');

      expect(prisma.dataset.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'ds_123',
          tenantId: 'tenant_alpha',
          deletedAt: null
        },
        include: {
          columns: true
        }
      });
      expect(result?.tenantId).toBe('tenant_alpha');
    });

    it('soft deletes dataset by setting deletedAt timestamp', async () => {
      (prisma.dataset.updateMany as any).mockResolvedValue({ count: 1 });

      await DatasetRepository.softDelete('tenant_alpha', 'ds_123');

      expect(prisma.dataset.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'ds_123',
          tenantId: 'tenant_alpha',
          deletedAt: null
        },
        data: {
          deletedAt: expect.any(Date)
        }
      });
    });
  });

  describe('ModelExecutionRepository - Multi-Tenant Isolation', () => {
    it('creates execution bound strictly to the calling tenantId', async () => {
      (prisma.modelExecution.create as any).mockResolvedValue({
        id: 'exec_789',
        tenantId: 'tenant_beta',
        status: 'PENDING'
      });

      const exec = await ModelExecutionRepository.createExecution('tenant_beta', {
        datasetId: 'ds_beta',
        config: { mcmcChains: 4 }
      });

      expect(prisma.modelExecution.create).toHaveBeenCalledWith({
        data: {
          tenantId: 'tenant_beta',
          datasetId: 'ds_beta',
          engine: 'google-meridian',
          config: { mcmcChains: 4 },
          status: 'PENDING'
        }
      });
      expect(exec.tenantId).toBe('tenant_beta');
    });

    it('records model result and marks execution completed in atomic transaction', async () => {
      (prisma.modelExecution.updateMany as any).mockResolvedValue({ count: 1 });
      (prisma.modelResult.create as any).mockResolvedValue({
        id: 'res_1',
        tenantId: 'tenant_alpha',
        executionId: 'exec_100',
        isConverged: true
      });

      await ModelExecutionRepository.recordResult('tenant_alpha', 'exec_100', {
        isConverged: true,
        channelsSummary: { google: { roi: 2.5 } }
      });

      expect(prisma.modelExecution.updateMany).toHaveBeenCalledWith({
        where: { id: 'exec_100', tenantId: 'tenant_alpha' },
        data: {
          status: 'COMPLETED',
          completedAt: expect.any(Date)
        }
      });
      expect(prisma.modelResult.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: 'tenant_alpha',
          executionId: 'exec_100',
          isConverged: true
        })
      });
    });
  });

  describe('IntegrationCredentialRepository - Tenant Key Vault', () => {
    it('upserts encrypted credentials isolated by tenant and platform', async () => {
      (prisma.integrationCredential.upsert as any).mockResolvedValue({
        id: 'cred_1',
        tenantId: 'tenant_gamma',
        platform: 'google-ads',
        status: 'configured'
      });

      await IntegrationCredentialRepository.upsertForTenant(
        'tenant_gamma',
        'google-ads',
        'encrypted_cipher_text_aes256',
        'v1'
      );

      expect(prisma.integrationCredential.upsert).toHaveBeenCalledWith({
        where: {
          tenantId_platform: {
            tenantId: 'tenant_gamma',
            platform: 'google-ads'
          }
        },
        create: {
          tenantId: 'tenant_gamma',
          platform: 'google-ads',
          encryptedData: 'encrypted_cipher_text_aes256',
          keyId: 'v1',
          status: 'configured',
          lastTestedAt: expect.any(Date)
        },
        update: {
          encryptedData: 'encrypted_cipher_text_aes256',
          keyId: 'v1',
          status: 'configured',
          lastTestedAt: expect.any(Date),
          deletedAt: null
        }
      });
    });
  });

  describe('AuditLogRepository - Data Retention Policy', () => {
    it('logs security actions with a calculated retention expiration date', async () => {
      (prisma.auditLog.create as any).mockResolvedValue({ id: 'log_1' });

      await AuditLogRepository.log({
        tenantId: 'tenant_audit',
        action: 'MCMC_CALIBRATION_INVOKED',
        ip: '10.0.0.1',
        retentionDays: 90
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: 'tenant_audit',
          action: 'MCMC_CALIBRATION_INVOKED',
          ip: '10.0.0.1',
          retentionUntil: expect.any(Date)
        })
      });
    });

    it('purges audit logs past their retention deadline', async () => {
      (prisma.auditLog.deleteMany as any).mockResolvedValue({ count: 15 });

      await AuditLogRepository.purgeExpired();

      expect(prisma.auditLog.deleteMany).toHaveBeenCalledWith({
        where: {
          retentionUntil: {
            lt: expect.any(Date)
          }
        }
      });
    });
  });

  describe('TenantRepository - Cascade Soft Delete Policy', () => {
    it('soft deletes tenant and cascades soft delete to all child resources', async () => {
      await TenantRepository.softDeleteTenant('tenant_to_close');

      expect(prisma.tenant.update).toHaveBeenCalledWith({
        where: { id: 'tenant_to_close' },
        data: { deletedAt: expect.any(Date) }
      });
      expect(prisma.dataset.updateMany).toHaveBeenCalledWith({
        where: { tenantId: 'tenant_to_close', deletedAt: null },
        data: { deletedAt: expect.any(Date) }
      });
      expect(prisma.modelExecution.updateMany).toHaveBeenCalledWith({
        where: { tenantId: 'tenant_to_close', deletedAt: null },
        data: { deletedAt: expect.any(Date) }
      });
      expect(prisma.integrationCredential.updateMany).toHaveBeenCalledWith({
        where: { tenantId: 'tenant_to_close', deletedAt: null },
        data: { deletedAt: expect.any(Date) }
      });
    });
  });
});
