import { prisma } from "@/lib/prisma";

export async function generateOrderNo(): Promise<string> {
  const count = await prisma.order.count();
  return `DH-${String(count + 1).padStart(6, "0")}`;
}
