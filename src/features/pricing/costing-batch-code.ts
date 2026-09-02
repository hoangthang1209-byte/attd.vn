import { prisma } from "@/lib/prisma";

export async function generateCostingBatchCode(): Promise<string> {
  const count = await prisma.pricingCostingBatch.count();
  return `BATCH-${String(count + 1).padStart(6, "0")}`;
}
