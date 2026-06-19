import { prisma } from "@/lib/prisma";

export async function generateSalesRepresentativeCode(): Promise<string> {
  const count = await prisma.salesRepresentative.count();
  return `NV-${String(count + 1).padStart(6, "0")}`;
}
