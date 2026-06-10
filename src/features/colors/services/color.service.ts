import { prisma } from "@/lib/prisma";

export async function getColors() {
  return prisma.color.findMany({
    orderBy: {
      name: "asc",
    },
  });
}