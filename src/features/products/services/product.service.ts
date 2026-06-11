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