#!/usr/bin/env npx tsx
/**
 * Idempotent seed for Vietnam administrative provinces and wards (2025 dataset).
 */
import { PrismaClient } from "@prisma/client";
import { seedAdministrativeDivisionsIfEmpty } from "../src/features/administrative/administrative.service";

const prisma = new PrismaClient();

async function main() {
  const result = await seedAdministrativeDivisionsIfEmpty();
  if (result.skipped) {
    console.log("Administrative divisions already exist. Seed skipped.");
  } else {
    console.log(
      `Seeded ${result.provincesCreated} province(s) and ${result.wardsCreated} ward(s).`,
    );
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
