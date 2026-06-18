import { prisma } from "@/lib/prisma";

export async function generateLeadCode(): Promise<string> {
  const count = await prisma.lead.count();
  return `LEAD-${String(count + 1).padStart(6, "0")}`;
}

export async function generateCustomerCode(): Promise<string> {
  const count = await prisma.customer.count();
  return `KH-${String(count + 1).padStart(6, "0")}`;
}
