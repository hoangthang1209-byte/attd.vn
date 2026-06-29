import { prisma } from "@/lib/prisma";

export function formatDealerCompanyCodeFromCount(count: number): string {
  return `DL-${String(count + 1).padStart(6, "0")}`;
}

export async function generateDealerCompanyCode(): Promise<string> {
  const count = await prisma.dealerCompany.count();
  return formatDealerCompanyCodeFromCount(count);
}
