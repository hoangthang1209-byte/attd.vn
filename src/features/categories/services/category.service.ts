import { prisma } from "@/lib/prisma";

export async function getCategories() {
  return prisma.category.findMany({
    orderBy: { name: "asc" },
  });
}

/** Categories with active product counts — for homepage marketplace grid. */
export async function getCategoriesWithCounts() {
  return prisma.category.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: { products: { where: { status: "ACTIVE" } } },
      },
    },
  });
}

export async function getCategoryBySlug(slug: string) {
  return prisma.category.findUnique({
    where: { slug },
    include: {
      products: {
        where: { status: "ACTIVE" },
        select: {
          id: true, name: true, slug: true, productCode: true,
          featuredImage: true, gallery: true,
          defaultMoq: true, leadTime: true,
          supportsPrinting: true, supportsEmbroidery: true, supportsOem: true,
          variants: { select: { id: true, stockStatus: true } },
          images: {
            select: { imageUrl: true, altText: true },
            orderBy: { sortOrder: "asc" },
            take: 1,
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}