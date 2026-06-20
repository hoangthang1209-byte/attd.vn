#!/usr/bin/env npx tsx
/**
 * Idempotent seed for default delivery methods when table is empty.
 */
import { PrismaClient } from "@prisma/client";
import { seedDefaultDeliveryMethodsIfEmpty } from "../src/features/delivery/delivery-method.service";

const prisma = new PrismaClient();

async function main() {
  const result = await seedDefaultDeliveryMethodsIfEmpty();
  if (result.skipped) {
    console.log("Delivery methods already exist. Seed skipped.");
  } else {
    console.log(`Seeded ${result.created} delivery method(s).`);
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
