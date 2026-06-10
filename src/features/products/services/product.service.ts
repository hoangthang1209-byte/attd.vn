import { prisma } from "@/lib/prisma";

export async function getProducts() {
  return prisma.product.findMany({
    include: {
      category: true,
      variants: true,
      images: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}