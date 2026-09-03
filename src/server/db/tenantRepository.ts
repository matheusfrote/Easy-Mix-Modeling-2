import { prisma } from './prismaClient';
import { Role, ExecutionStatus } from '@prisma/client';

/**
 * Multi-Tenant Data Repositories
 * Strictly enforces tenant_id on every query, write, and deletion.
 * Implements soft delete and data retention policies.
 */

export class TenantRepository {
  static async findById(tenantId: string) {
    return prisma.tenant.findFirst({
      where: {
        id: tenantId,
        deletedAt: null
      },
      include: {
        memberships: {
          where: { deletedAt: null },
          include: { user: true }
        }
      }
    });
  }

  static async findBySlug(slug: string) {
    return prisma.tenant.findFirst({
      where: {
        slug,
        deletedAt: null
      }
    });
  }

  static async createTenant(data: { name: string; slug: string; plan?: string }) {
    return prisma.tenant.create({
      data: {
        name: data.name,
        slug: data.slug,
        plan: data.plan || 'starter'
      }
    });
  }

  static async softDeleteTenant(tenantId: string) {
    const now = new Date();
    return prisma.$transaction([
      prisma.tenant.update({
        where: { id: tenantId },
        data: { deletedAt: now }
      }),
      prisma.membership.updateMany({
        where: { tenantId, deletedAt: null },
        data: { deletedAt: now }
      }),
      prisma.dataset.updateMany({
        where: { tenantId, deletedAt: null },
        data: { deletedAt: now }
      }),
      prisma.modelExecution.updateMany({
        where: { tenantId, deletedAt: null },
        data: { deletedAt: now }
      }),
      prisma.budgetScenario.updateMany({
        where: { tenantId, deletedAt: null },
        data: { deletedAt: now }
      }),
      prisma.integrationCredential.updateMany({
        where: { tenantId, deletedAt: null },
        data: { deletedAt: now }
      })
    ]);
  }
}

export class DatasetRepository {
  static async findForTenant(tenantId: string, datasetId: string) {
    return prisma.dataset.findFirst({
      where: {
        id: datasetId,
        tenantId,
        deletedAt: null
      },
      include: {
        columns: true
      }
    });
  }

  static async listForTenant(tenantId: string) {
    return prisma.dataset.findMany({
      where: {
        tenantId,
        deletedAt: null
      },
      orderBy: { createdAt: 'desc' },
      include: {
        columns: true
      }
    });
  }

  static async createForTenant(
    tenantId: string,
    data: {
      name: string;
      filename: string;
      rowCount: number;
      columnCount: number;
      readinessScore?: number;
      columns: Array<{
        name: string;
        inferredRole: string;
        channelName?: string;
        channelType?: string;
        dataType: string;
        nullCount?: number;
      }>;
    }
  ) {
    return prisma.dataset.create({
      data: {
        tenantId,
        name: data.name,
        filename: data.filename,
        rowCount: data.rowCount,
        columnCount: data.columnCount,
        readinessScore: data.readinessScore,
        columns: {
          create: data.columns.map(c => ({
            tenantId,
            name: c.name,
            inferredRole: c.inferredRole,
            channelName: c.channelName,
            channelType: c.channelType,
            dataType: c.dataType,
            nullCount: c.nullCount || 0
          }))
        }
      },
      include: {
        columns: true
      }
    });
  }

  static async softDelete(tenantId: string, datasetId: string) {
    return prisma.dataset.updateMany({
      where: {
        id: datasetId,
        tenantId,
        deletedAt: null
      },
      data: {
        deletedAt: new Date()
      }
    });
  }
}

export class ModelExecutionRepository {
  static async findForTenant(tenantId: string, executionId: string) {
    return prisma.modelExecution.findFirst({
      where: {
        id: executionId,
        tenantId,
        deletedAt: null
      },
      include: {
        result: true
      }
    });
  }

  static async listForTenant(tenantId: string) {
    return prisma.modelExecution.findMany({
      where: {
        tenantId,
        deletedAt: null
      },
      orderBy: { createdAt: 'desc' },
      include: {
        result: true
      }
    });
  }

  static async createExecution(
    tenantId: string,
    data: {
      datasetId?: string;
      engine?: string;
      config: any;
    }
  ) {
    return prisma.modelExecution.create({
      data: {
        tenantId,
        datasetId: data.datasetId,
        engine: data.engine || 'google-meridian',
        config: data.config,
        status: ExecutionStatus.PENDING
      }
    });
  }

  static async updateStatus(
    tenantId: string,
    executionId: string,
    status: ExecutionStatus,
    errorMessage?: string
  ) {
    const isCompleted = status === ExecutionStatus.COMPLETED;
    return prisma.modelExecution.updateMany({
      where: {
        id: executionId,
        tenantId,
        deletedAt: null
      },
      data: {
        status,
        errorMessage: errorMessage || null,
        startedAt: status === ExecutionStatus.RUNNING ? new Date() : undefined,
        completedAt: isCompleted ? new Date() : undefined
      }
    });
  }

  static async recordResult(
    tenantId: string,
    executionId: string,
    result: {
      rSquared?: number;
      mape?: number;
      rmse?: number;
      rHatMax?: number;
      essMin?: number;
      isConverged: boolean;
      blendedRoi?: number;
      blendedRoas?: number;
      totalSpend?: number;
      totalKpi?: number;
      channelsSummary: any;
      responseCurves?: any;
      diagnosticsJson?: any;
    }
  ) {
    return prisma.$transaction([
      prisma.modelExecution.updateMany({
        where: { id: executionId, tenantId },
        data: {
          status: ExecutionStatus.COMPLETED,
          completedAt: new Date()
        }
      }),
      prisma.modelResult.create({
        data: {
          tenantId,
          executionId,
          rSquared: result.rSquared,
          mape: result.mape,
          rmse: result.rmse,
          rHatMax: result.rHatMax,
          essMin: result.essMin,
          isConverged: result.isConverged,
          blendedRoi: result.blendedRoi,
          blendedRoas: result.blendedRoas,
          totalSpend: result.totalSpend,
          totalKpi: result.totalKpi,
          channelsSummary: result.channelsSummary,
          responseCurves: result.responseCurves,
          diagnosticsJson: result.diagnosticsJson
        }
      })
    ]);
  }

  static async softDelete(tenantId: string, executionId: string) {
    const now = new Date();
    return prisma.$transaction([
      prisma.modelExecution.updateMany({
        where: { id: executionId, tenantId, deletedAt: null },
        data: { deletedAt: now }
      }),
      prisma.modelResult.updateMany({
        where: { executionId, tenantId, deletedAt: null },
        data: { deletedAt: now }
      })
    ]);
  }
}

export class BudgetScenarioRepository {
  static async findForTenant(tenantId: string, scenarioId: string) {
    return prisma.budgetScenario.findFirst({
      where: {
        id: scenarioId,
        tenantId,
        deletedAt: null
      }
    });
  }

  static async listForTenant(tenantId: string) {
    return prisma.budgetScenario.findMany({
      where: {
        tenantId,
        deletedAt: null
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async saveScenario(
    tenantId: string,
    data: {
      executionId?: string;
      name: string;
      targetBudget: number;
      projectedKpi: number;
      blendedRoi: number;
      allocations: any;
      constraints?: any;
    }
  ) {
    return prisma.budgetScenario.create({
      data: {
        tenantId,
        executionId: data.executionId,
        name: data.name,
        targetBudget: data.targetBudget,
        projectedKpi: data.projectedKpi,
        blendedRoi: data.blendedRoi,
        allocations: data.allocations,
        constraints: data.constraints
      }
    });
  }

  static async softDelete(tenantId: string, scenarioId: string) {
    return prisma.budgetScenario.updateMany({
      where: {
        id: scenarioId,
        tenantId,
        deletedAt: null
      },
      data: {
        deletedAt: new Date()
      }
    });
  }
}

export class IntegrationCredentialRepository {
  static async getForTenant(tenantId: string, platform: string) {
    return prisma.integrationCredential.findFirst({
      where: {
        tenantId,
        platform,
        deletedAt: null
      }
    });
  }

  static async upsertForTenant(
    tenantId: string,
    platform: string,
    encryptedData: string,
    keyId = 'v1'
  ) {
    return prisma.integrationCredential.upsert({
      where: {
        tenantId_platform: {
          tenantId,
          platform
        }
      },
      create: {
        tenantId,
        platform,
        encryptedData,
        keyId,
        status: 'configured',
        lastTestedAt: new Date()
      },
      update: {
        encryptedData,
        keyId,
        status: 'configured',
        lastTestedAt: new Date(),
        deletedAt: null
      }
    });
  }

  static async softDelete(tenantId: string, platform: string) {
    return prisma.integrationCredential.updateMany({
      where: {
        tenantId,
        platform,
        deletedAt: null
      },
      data: {
        deletedAt: new Date()
      }
    });
  }
}

export class AuditLogRepository {
  static async log(data: {
    tenantId?: string;
    userId?: string;
    sessionId?: string;
    action: string;
    ip: string;
    path?: string;
    method?: string;
    details?: any;
    retentionDays?: number;
  }) {
    const retentionDays = data.retentionDays || 90; // Standard 90 days retention per security policy
    const retentionUntil = new Date();
    retentionUntil.setDate(retentionUntil.getDate() + retentionDays);

    return prisma.auditLog.create({
      data: {
        tenantId: data.tenantId,
        userId: data.userId,
        sessionId: data.sessionId,
        action: data.action,
        ip: data.ip,
        path: data.path,
        method: data.method,
        details: data.details || {},
        retentionUntil
      }
    });
  }

  /**
   * Data Retention Policy: purges audit logs past their retention deadline
   */
  static async purgeExpired() {
    return prisma.auditLog.deleteMany({
      where: {
        retentionUntil: {
          lt: new Date()
        }
      }
    });
  }
}
