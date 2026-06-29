import { prisma } from "@/lib/prisma";

export function formatDealerRFQCodeFromCount(count: number): string {
  return `RFQ-${String(count + 1).padStart(6, "0")}`;
}

export async function generateDealerRFQCode(): Promise<string> {
  const count = await prisma.dealerRFQ.count();
  return formatDealerRFQCodeFromCount(count);
}
