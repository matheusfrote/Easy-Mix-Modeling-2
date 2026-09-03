import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var prismaInstance: PrismaClient | undefined;
}

export function getPrismaClient(): PrismaClient {
  if (process.env.NODE_ENV === 'production') {
    return new PrismaClient({
      log: ['error', 'warn']
    });
  }

  if (!global.prismaInstance) {
    global.prismaInstance = new PrismaClient({
      log: ['error', 'warn']
    });
  }
  return global.prismaInstance;
}

export const prisma = getPrismaClient();
