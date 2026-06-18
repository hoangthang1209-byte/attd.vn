import type { Prisma } from "@prisma/client";
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

/** Public product listing with optional category/search filter and pagination. */
export async function getProductsForPublicListing(params: {
  categorySlug?: string;
  search?: string;
  page?: number;
  perPage?: number;
  inStock?: boolean;
  supportsPrinting?: boolean;
  supportsEmbroidery?: boolean;
  supportsOem?: boolean;
  material?: string;
} = {}) {
  const {
    categorySlug,
    search,
    page = 1,
    perPage = 24,
    inStock,
    supportsPrinting,
    supportsEmbroidery,
    supportsOem,
    material,
  } = params;

  const where: Prisma.ProductWhereInput = {
    status: "ACTIVE",
    slug: { not: "" },
    ...(categorySlug && { category: { slug: categorySlug } }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { productCode: { contains: search, mode: "insensitive" } },
        { tags: { has: search } },
      ],
    }),
    ...(supportsPrinting && { supportsPrinting: true }),
    ...(supportsEmbroidery && { supportsEmbroidery: true }),
    ...(supportsOem && { supportsOem: true }),
    ...(material && {
      material: { contains: material, mode: "insensitive" },
    }),
    ...(inStock && {
      variants: {
        some: { stockStatus: { in: ["IN_STOCK", "LOW_STOCK"] } },
      },
    }),
  };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        category: true,
        images: {
          select: { imageUrl: true, altText: true },
          orderBy: { sortOrder: "asc" },
          take: 1,
        },
        variants: { select: { id: true, stockStatus: true, colorName: true, sizeName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: perPage,
      skip: (page - 1) * perPage,
    }),
    prisma.product.count({ where }),
  ]);

  return { products, total, page, perPage };
}

/** Lightweight counts for homepage marketplace strip. */
export async function getPublicCatalogStats() {
  const [productCount, variantCount, categoryCount] = await Promise.all([
    prisma.product.count({ where: { status: "ACTIVE", slug: { not: "" } } }),
    prisma.productVariant.count({
      where: { product: { status: "ACTIVE", slug: { not: "" } } },
    }),
    prisma.category.count(),
  ]);
  return { productCount, variantCount, categoryCount };
}

const PUBLIC_PRODUCT_CARD_SELECT = {
  id: true,
  name: true,
  slug: true,
  productCode: true,
  featuredImage: true,
  gallery: true,
  defaultMoq: true,
  leadTime: true,
  supportsPrinting: true,
  supportsEmbroidery: true,
  supportsOem: true,
  category: { select: { name: true, slug: true } },
  variants: { select: { id: true, stockStatus: true } },
  images: {
    select: { imageUrl: true, altText: true },
    orderBy: { sortOrder: "asc" as const },
    take: 1,
  },
};

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
    select: PUBLIC_PRODUCT_CARD_SELECT,
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

/** Cross-sell products from other categories for product detail recommendations. */
export async function getCrossSellProducts(
  excludeProductId: string,
  excludeCategoryId: string,
  limit = 4
) {
  return prisma.product.findMany({
    where: {
      id: { not: excludeProductId },
      categoryId: { not: excludeCategoryId },
      status: "ACTIVE",
      slug: { not: "" },
    },
    select: PUBLIC_PRODUCT_CARD_SELECT,
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}