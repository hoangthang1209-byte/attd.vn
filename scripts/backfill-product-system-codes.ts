#!/usr/bin/env npx tsx
/**
 * Idempotent backfill: assign Product.systemCode (SP-000001) where missing.
 * Does not overwrite productCode or existing systemCode values.
 */
import { PrismaClient } from "@prisma/client";
import {
  formatProductSystemCode,
  getMaxProductSystemCodeSequence,
} from "../src/features/products/product-system-code";

const prisma = new PrismaClient();

async function main() {
  const missing = await prisma.product.findMany({
    where: { systemCode: null },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true },
  });

  if (missing.length === 0) {
    console.log("All products already have systemCode. Nothing to backfill.");
    return;
  }

  let sequence = await getMaxProductSystemCodeSequence();
  let updated = 0;

  for (const product of missing) {
    sequence += 1;
    const systemCode = formatProductSystemCode(sequence);
    await prisma.product.update({
      where: { id: product.id },
      data: { systemCode },
    });
    updated += 1;
    console.log(`Assigned ${systemCode} -> ${product.name}`);
  }

  console.log(`Backfill complete. Updated ${updated} product(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
