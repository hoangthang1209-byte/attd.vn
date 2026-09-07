import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient();

// Always reuse one client across Next.js workers/chunks. Multiple clients on Neon
// (connection_limit≈3) exhaust the pool during catalog SSG.
globalForPrisma.prisma = prisma;