import { PrismaClient } from "@prisma/client";

export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL?.trim() ?? "";

export function hasConfiguredTestDatabase(): boolean {
  return Boolean(TEST_DATABASE_URL);
}

export function requireTestDatabaseUrl(): string {
  if (!TEST_DATABASE_URL) {
    throw new Error(
      "TEST_DATABASE_URL is not configured. Set it to an isolated database before running database-backed product tests.",
    );
  }
  return TEST_DATABASE_URL;
}

export async function resetPrismaTestClient(): Promise<PrismaClient> {
  const globalForPrisma = globalThis as { prisma?: PrismaClient };
  if (globalForPrisma.prisma) {
    await globalForPrisma.prisma.$disconnect();
    delete globalForPrisma.prisma;
  }
  process.env.DATABASE_URL = requireTestDatabaseUrl();
  const { prisma } = await import("@/lib/prisma");
  return prisma;
}

export function uniqueTestKey(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
