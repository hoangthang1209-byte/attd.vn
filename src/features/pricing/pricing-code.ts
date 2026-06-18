import { prisma } from "@/lib/prisma";

export async function generatePricingCalculationCode(): Promise<string> {
  const count = await prisma.pricingCalculation.count();
  return `PRICE-${String(count + 1).padStart(6, "0")}`;
}
