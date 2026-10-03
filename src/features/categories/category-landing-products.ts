import type { Prisma } from "@prisma/client";
import { buildPublicProductVisibilityWhere, isDemoOrSampleProductMetadata } from "@/features/products/product-public-visibility";

export const CATEGORY_LANDING_PRODUCT_LIMIT = 24;

/** Shares the catalog's resolved category scope; landings show a bounded preview. */
export async function loadCategoryLandingProducts<T extends { metadata?: unknown }>(
  categoryIds: string[],
  findMany: (query: { where: Prisma.ProductWhereInput; take: number; orderBy: { createdAt: "desc" } }) => Promise<T[]>,
): Promise<{ products: T[]; hasMoreProducts: boolean }> {
  if (categoryIds.length === 0) return { products: [], hasMoreProducts: false };
  const rows = await findMany({
    where: buildPublicProductVisibilityWhere({ categoryId: { in: categoryIds } }),
    take: CATEGORY_LANDING_PRODUCT_LIMIT + 1,
    orderBy: { createdAt: "desc" },
  });
  const visible = rows.filter((row) => !isDemoOrSampleProductMetadata(row.metadata));
  return {
    products: visible.slice(0, CATEGORY_LANDING_PRODUCT_LIMIT),
    hasMoreProducts: visible.length > CATEGORY_LANDING_PRODUCT_LIMIT,
  };
}
