import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCategoryFilterIdsBySlug } from "@/features/categories/services/category.service";
import {
  buildDefaultCustomizationsFromFlags,
  mapProductToPublicDetail,
} from "@/features/products/product-detail.mapper";
import type { PublicProductDetail } from "@/features/products/product-detail.types";
import {
  isPartialCatalogSchemaError,
  normalizeLegacyProductRow,
  PRODUCT_DETAIL_LEGACY_SELECT,
} from "@/features/products/product-detail-compat";
import { PUBLIC_IN_STOCK_VARIANT_FILTER } from "@/features/products/product-foundation-validation";
import { PRODUCT_CARD_COLOR_VARIANT_SELECT } from "@/features/products/product-card-color-swatches";

const PRODUCT_DETAIL_INCLUDE = {
  category: { select: { id: true, name: true, slug: true } },
  // Product.metadata is a scalar Json field — Prisma returns scalars with `include`.
  // Putting `metadata: true` here throws PrismaClientValidationError and crashes PDP.
  images: { orderBy: { sortOrder: "asc" as const } },
  options: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      values: { orderBy: { sortOrder: "asc" as const } },
    },
  },
  specifications: { orderBy: { sortOrder: "asc" as const } },
  attributeAssignments: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      attribute: { select: { id: true, name: true, code: true } },
      attributeValue: { select: { id: true, name: true, status: true } },
    },
  },
  customizationCapabilities: { orderBy: { sortOrder: "asc" as const } },
  variants: {
    where: { variantStatus: "ACTIVE" },
    include: {
      color: { select: { name: true } },
      size: { select: { name: true } },
      optionValues: {
        include: {
          optionValue: {
            include: { option: { select: { id: true, slug: true, name: true } } },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" as const },
  },
} as const;

function mapFetchedProductToPublicDetail(
  product: Parameters<typeof mapProductToPublicDetail>[0],
): PublicProductDetail {
  const detail = mapProductToPublicDetail(product);
  if (detail.customizations.length === 0) {
    detail.customizations = buildDefaultCustomizationsFromFlags(product);
  }
  return detail;
}

export async function getProductDetailBySlug(slug: string): Promise<PublicProductDetail | null> {
  try {
    const product = await prisma.product.findUnique({
      where: { slug, status: "ACTIVE" },
      include: PRODUCT_DETAIL_INCLUDE,
    });
    if (!product) return null;
    return mapFetchedProductToPublicDetail(product);
  } catch (error) {
    if (!isPartialCatalogSchemaError(error)) {
      // Defensive fallback: never let optional relation/query shape crash an ACTIVE PDP.
      console.error("[pdp] getProductDetailBySlug primary query failed; trying legacy select", {
        slug,
        errorName: error instanceof Error ? error.name : typeof error,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    }

    try {
      const legacy = await prisma.product.findUnique({
        where: { slug, status: "ACTIVE" },
        select: PRODUCT_DETAIL_LEGACY_SELECT,
      });
      if (!legacy) return null;
      return mapFetchedProductToPublicDetail(normalizeLegacyProductRow(legacy));
    } catch (legacyError) {
      console.error("[pdp] getProductDetailBySlug legacy fallback failed", {
        slug,
        errorName: legacyError instanceof Error ? legacyError.name : typeof legacyError,
        errorMessage: legacyError instanceof Error ? legacyError.message : String(legacyError),
      });
      throw legacyError;
    }
  }
}

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
        where: { variantStatus: "ACTIVE" },
        select: {
          id: true,
          sku: true,
          colorName: true,
          colorCode: true,
          sizeName: true,
          dimensions: true,
          capacity: true,
          imageUrl: true,
          stockStatus: true,
          stockQty: true,
          variantStatus: true,
          color: { select: { name: true } },
          size: { select: { name: true } },
        },
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
        where: { variantStatus: "ACTIVE" },
        select: {
          id: true,
          sku: true,
          colorName: true,
          colorCode: true,
          sizeName: true,
          dimensions: true,
          capacity: true,
          imageUrl: true,
          stockStatus: true,
          stockQty: true,
          variantStatus: true,
          color: { select: { name: true } },
          size: { select: { name: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

const PUBLIC_PRODUCT_CARD_VARIANT_SELECT = PRODUCT_CARD_COLOR_VARIANT_SELECT;

/** Search OR clauses for public catalog listing — name, code, slug, tags. */
export function buildPublicProductListingSearchOr(
  search: string,
): Prisma.ProductWhereInput[] {
  const q = search.trim();
  if (!q) return [];
  return [
    { name: { contains: q, mode: "insensitive" } },
    { productCode: { contains: q, mode: "insensitive" } },
    { slug: { contains: q, mode: "insensitive" } },
    { tags: { has: q } },
  ];
}

export function buildPublicProductListingWhere(params: {
  categoryIds?: string[];
  search?: string;
  inStock?: boolean;
  supportsPrinting?: boolean;
  supportsEmbroidery?: boolean;
  supportsOem?: boolean;
  material?: string;
}): Prisma.ProductWhereInput {
  const searchOr = params.search ? buildPublicProductListingSearchOr(params.search) : [];
  return {
    status: "ACTIVE",
    slug: { not: "" },
    ...(params.categoryIds && { categoryId: { in: params.categoryIds } }),
    ...(searchOr.length > 0 && { OR: searchOr }),
    ...(params.supportsPrinting && { supportsPrinting: true }),
    ...(params.supportsEmbroidery && { supportsEmbroidery: true }),
    ...(params.supportsOem && { supportsOem: true }),
    ...(params.material && {
      material: { contains: params.material, mode: "insensitive" },
    }),
    ...(params.inStock && {
      variants: {
        some: PUBLIC_IN_STOCK_VARIANT_FILTER,
      },
    }),
  };
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

  let categoryIds: string[] | undefined;
  if (categorySlug) {
    categoryIds = await getCategoryFilterIdsBySlug(categorySlug);
    if (categoryIds.length === 0) {
      return { products: [], total: 0, page, perPage };
    }
  }

  const where = buildPublicProductListingWhere({
    categoryIds,
    search,
    inStock,
    supportsPrinting,
    supportsEmbroidery,
    supportsOem,
    material,
  });

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        category: true,
        images: {
          select: { imageUrl: true, altText: true, sortOrder: true },
          orderBy: { sortOrder: "asc" },
        },
        variants: {
          where: { variantStatus: "ACTIVE" as const },
          select: PUBLIC_PRODUCT_CARD_VARIANT_SELECT,
        },
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
  metadata: true,
  category: { select: { name: true, slug: true } },
  variants: {
    where: { variantStatus: "ACTIVE" as const },
    select: PUBLIC_PRODUCT_CARD_VARIANT_SELECT,
  },
  images: {
    select: { imageUrl: true, altText: true, sortOrder: true },
    orderBy: { sortOrder: "asc" as const },
  },
} as const;

export { PUBLIC_PRODUCT_CARD_SELECT, PUBLIC_PRODUCT_CARD_VARIANT_SELECT };

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