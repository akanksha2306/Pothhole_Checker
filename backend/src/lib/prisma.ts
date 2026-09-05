/**
 * Prisma client singleton.
 *
 * The client connects lazily — instantiating it performs no I/O, so booting the
 * API without a reachable database is fine (the health check does not query).
 */
import { PrismaClient } from '@prisma/client';
import { env, isProduction } from './env.js';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: env.DATABASE_URL,
    log: isProduction ? ['error'] : ['error', 'warn'],
  });

if (!isProduction) {
  // Survive tsx watch hot-reloads, which would otherwise open a new pool per restart.
  globalForPrisma.prisma = prisma;
}
