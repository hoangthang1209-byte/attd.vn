import { prisma } from "@/lib/prisma";

export async function getSizes() {
  return prisma.size.findMany({
    orderBy: {
      name: "asc",
    },
  });
}