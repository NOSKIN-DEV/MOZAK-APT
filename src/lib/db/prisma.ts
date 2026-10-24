import { PrismaClient } from "@prisma/client";

/**
 * Cliente de Prisma compartido (singleton).
 *
 * En desarrollo, Next.js recarga los módulos en caliente; sin guardarlo en
 * `globalThis` cada recarga abriría un cliente (y un pool de conexiones) nuevo.
 *
 * La URL de conexión se lee de DATABASE_URL (ver .env.example). Nunca se
 * escribe en el código.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export function getPrisma(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient();
  }
  return globalForPrisma.prisma;
}
