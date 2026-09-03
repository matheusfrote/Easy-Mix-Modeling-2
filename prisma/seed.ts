import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Ingressando Seed de Teste Multi-Tenant (MySQL + Prisma) ---');

  // 1. Create or upsert Demo Tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo-corp' },
    update: {},
    create: {
      name: 'Demo Marketing Corp',
      slug: 'demo-corp',
      plan: 'pro',
      status: 'active'
    }
  });

  console.log(`Tenant configurado: ${tenant.name} (${tenant.id})`);

  // 2. Create Users with RBAC Roles
  const usersData = [
    { email: 'admin@democorp.com', name: 'Alice Admin', role: Role.ADMIN },
    { email: 'analyst@democorp.com', name: 'Bob Analyst', role: Role.ANALYST },
    { email: 'viewer@democorp.com', name: 'Carol Viewer', role: Role.VIEWER }
  ];

  for (const u of usersData) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name },
      create: {
        email: u.email,
        name: u.name
      }
    });

    await prisma.membership.upsert({
      where: {
        tenantId_userId: {
          tenantId: tenant.id,
          userId: user.id
        }
      },
      update: { role: u.role },
      create: {
        tenantId: tenant.id,
        userId: user.id,
        role: u.role
      }
    });

    console.log(`Usuário e Membership: ${user.email} -> ${u.role}`);
  }

  // 3. Create Demo Dataset
  const dataset = await prisma.dataset.create({
    data: {
      tenantId: tenant.id,
      name: 'Vendas_e_Midia_2023_2024.csv',
      filename: 'sample_mmm_dataset.csv',
      rowCount: 104,
      columnCount: 6,
      readinessScore: 92.5,
      columns: {
        create: [
          { tenantId: tenant.id, name: 'date', inferredRole: 'date', dataType: 'date' },
          { tenantId: tenant.id, name: 'revenue', inferredRole: 'kpi', dataType: 'numeric' },
          { tenantId: tenant.id, name: 'google_spend', inferredRole: 'spend', channelName: 'Google Search', channelType: 'digital', dataType: 'numeric' },
          { tenantId: tenant.id, name: 'meta_spend', inferredRole: 'spend', channelName: 'Meta Ads', channelType: 'digital', dataType: 'numeric' },
          { tenantId: tenant.id, name: 'tv_spend', inferredRole: 'spend', channelName: 'TV Broadcast', channelType: 'tv', dataType: 'numeric' },
          { tenantId: tenant.id, name: 'discount_rate', inferredRole: 'control', dataType: 'numeric' }
        ]
      }
    }
  });

  console.log(`Dataset de teste inserido: ${dataset.name} (${dataset.id})`);

  // 4. Create Audit Log entry
  await prisma.auditLog.create({
    data: {
      tenantId: tenant.id,
      action: 'SYSTEM_SEED_INITIALIZED',
      ip: '127.0.0.1',
      details: {
        datasetId: dataset.id,
        tenantSlug: tenant.slug
      }
    }
  });

  console.log('--- Seed multi-tenant concluído com sucesso! ---');
}

main()
  .catch((e) => {
    console.error('Erro ao executar seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
