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

export async function getProductBySlug(slug: string) {
  return prisma.product.findUnique({
    where: { slug },
    include: {
      category: true,
      images: { orderBy: { sortOrder: "asc" } },
      variants: {
        include: { color: true, size: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

export async function getProductById(id: string) {
  return prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      images: { orderBy: { sortOrder: "asc" } },
      variants: {
        include: { color: true, size: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

/** Returns up to `limit` active products in the same category, excluding the given product. */
export async function getRelatedProducts(
  categoryId: string,
  excludeProductId: string,
  limit = 4
) {
  return prisma.product.findMany({
    where: {
      categoryId,
      id: { not: excludeProductId },
      status: "ACTIVE",
      slug: { not: "" },
    },
    include: {
      variants: { select: { id: true } },
      images: {
        select: { imageUrl: true, altText: true },
        orderBy: { sortOrder: "asc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}