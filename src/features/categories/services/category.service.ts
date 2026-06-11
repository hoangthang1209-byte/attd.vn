import { prisma } from "@/lib/prisma";

export async function getCategories() {
  return prisma.category.findMany({
    orderBy: {
      name: "asc",
    },
  });
}

export async function getCategoryBySlug(slug: string) {
  return prisma.category.findUnique({
    where: { slug },
    include: {
      products: {
        where: { status: "ACTIVE" },
        include: {
          variants: { select: { id: true } },
          images: {
            select: { imageUrl: true },
            orderBy: { sortOrder: "asc" },
            take: 1,
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}