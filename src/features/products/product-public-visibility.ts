import type { Prisma, ProductStatus } from "@prisma/client";

/** Canonical statuses that must never appear on public web surfaces. */
export const NON_PUBLIC_PRODUCT_STATUSES: ProductStatus[] = [
  "DRAFT",
  "INACTIVE",
  "ARCHIVED",
];

/**
 * Shared public catalog visibility rules (Prisma `where`).
 *
 * Canonical public visibility:
 * - status ACTIVE
 * - non-empty slug
 * - category isActive
 *
 * Explicitly NOT part of public visibility:
 * - admin readiness (missing image/price/SEO/stock)
 * - image-health / broken image URLs
 *
 * Demo/sample metadata exclusion:
 * Do NOT encode demo exclusion as Prisma JSON `NOT { path: ["isDemo"], equals: true }`.
 * On PostgreSQL that filter treats missing JSON keys as UNKNOWN and falsely excludes
 * legitimate ACTIVE products that only have other metadata (e.g. curatedSalesBadges).
 * Use {@link isDemoOrSampleProductMetadata} / {@link shouldHideProductFromPublic}
 * after fetch instead. Demo products remain ARCHIVED by policy.
 */
export function buildPublicProductVisibilityWhere(
  extra: Prisma.ProductWhereInput = {},
): Prisma.ProductWhereInput {
  return {
    status: "ACTIVE",
    slug: { not: "" },
    category: { isActive: true },
    ...extra,
  };
}

export function isPublicProductStatus(status: ProductStatus | string | null | undefined): boolean {
  return status === "ACTIVE";
}

export function shouldHideProductFromPublic(input: {
  status: ProductStatus | string | null | undefined;
  slug?: string | null;
  categoryIsActive?: boolean | null;
  metadata?: unknown;
}): boolean {
  if (!isPublicProductStatus(input.status)) return true;
  if (!input.slug?.trim()) return true;
  if (input.categoryIsActive === false) return true;
  if (isDemoOrSampleProductMetadata(input.metadata)) return true;
  return false;
}

export function isDemoOrSampleProductMetadata(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return false;
  const record = metadata as Record<string, unknown>;
  return record.isDemo === true || record.sampleData === true;
}

/** Post-query guard for rows already filtered by {@link buildPublicProductVisibilityWhere}. */
export function isPublicVisibleProductRow(input: {
  status?: ProductStatus | string | null;
  slug?: string | null;
  metadata?: unknown;
  categoryIsActive?: boolean | null;
}): boolean {
  return !shouldHideProductFromPublic({
    status: input.status ?? "ACTIVE",
    slug: input.slug,
    categoryIsActive: input.categoryIsActive ?? true,
    metadata: input.metadata,
  });
}

export function planBulkPublicRevalidationPaths(input: {
  slugs: string[];
  categorySlugs?: string[];
  affectsHomepage?: boolean;
}): string[] {
  const paths = new Set<string>(["/san-pham", "/sitemap.xml"]);
  for (const slug of input.slugs) {
    const trimmed = slug.trim();
    if (trimmed) paths.add(`/san-pham/${trimmed}`);
  }
  for (const categorySlug of input.categorySlugs ?? []) {
    const trimmed = categorySlug.trim();
    if (!trimmed) continue;
    paths.add(`/san-pham?category=${trimmed}`);
    paths.add(`/${trimmed}`);
  }
  if (input.affectsHomepage) paths.add("/");
  return Array.from(paths);
}
