import { PrismaClient } from '@prisma/client';

let prisma: any;
try {
  prisma = new PrismaClient();
} catch {
  console.warn('[AI Studio] Database not connected — using mock');
  const noOp = { findMany: async () => [], findFirst: async () => null,
    findUnique: async () => null, create: async (d: any) => d?.data ?? {},
    update: async (d: any) => d?.data ?? {}, delete: async () => ({}) };
  prisma = new Proxy({}, { get: () => noOp });
}

export function getPrismaClient(): PrismaClient {
  return prisma as PrismaClient;
}

export { prisma };
