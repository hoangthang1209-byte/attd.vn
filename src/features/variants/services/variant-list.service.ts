import { prisma } from "@/lib/prisma";

export async function getVariants() {
  return prisma.productVariant.findMany({
    include: {
      product: true,
      color: true,
      size: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}