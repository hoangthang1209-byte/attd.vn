import { prisma } from "@/lib/prisma";

export async function getDealers() {
  return prisma.dealer.findMany({
    orderBy: { createdAt: "desc" },
  });
}
