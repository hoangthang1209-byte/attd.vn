#!/usr/bin/env npx tsx
/**
 * Idempotent seed for default delivery carriers when table is empty.
 */
import { PrismaClient } from "@prisma/client";
import { seedDefaultDeliveryCarriersIfEmpty } from "../src/features/delivery/delivery-carrier.service";

const prisma = new PrismaClient();

async function main() {
  const result = await seedDefaultDeliveryCarriersIfEmpty();
  if (result.skipped) {
    console.log("Delivery carriers already exist. Seed skipped.");
  } else {
    console.log(`Seeded ${result.created} delivery carrier(s).`);
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
