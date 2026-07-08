import { prisma } from "@/lib/prisma";

export async function generateSalesOpportunityCode(): Promise<string> {
  const count = await prisma.salesOpportunity.count();
  return `OPP-${String(count + 1).padStart(6, "0")}`;
}
