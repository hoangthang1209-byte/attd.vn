/**
 * Curated SEO category landing allowlist.
 * Only slugs listed here may be indexed at `/{slug}` and used as catalog filter canonical targets.
 * Extend deliberately when launching new commercial category landings.
 */
export const INDEXABLE_CATEGORY_LANDING_SLUGS = new Set([
  "ao-thun-tron",
  "ao-polo-tron",
  "non",
  "non-dong-phuc",
  "tote",
  "tote-bag",
  "bandana",
  "khan-bandana",
  "binh-giu-nhiet",
  "gift-set-doanh-nghiep",
  "ao-khoac-dong-phuc",
]);

/**
 * Root-level static pages with dedicated route files.
 * Excluded from DB-driven `/{slug}` sitemap entries to avoid duplicates.
 */
export const RESERVED_STATIC_PUBLIC_SLUGS = new Set([
  "san-pham",
  "blog",
  "q",
  "quote-link",
  "lien-he",
  "dai-ly",
  "oem",
  "nguon-hang",
  "qua-tang-doanh-nghiep",
  "chinh-sach-dai-ly",
  "gift-set-doanh-nghiep",
  "ao-thun-tron-si",
  "kho-ao-thun-tron",
  "nguon-hang-ao-thun-tron",
  "ao-polo-tron-si",
  "kho-ao-polo-tron",
  "bang-mau-ao-thun-tron",
  "size-ao-thun-tron",
  "vai-cotton-2-chieu",
  "vai-cvc-la-gi",
  "vai-tc-la-gi",
  "ao-thun-cong-ty",
  "ao-thun-su-kien",
  "ao-thun-team-building",
  "ao-thun-nhan-vien",
  "ao-thun-doanh-nghiep",
]);

/** Approved static commercial paths for sitemap (path only, no origin). */
export const INDEXABLE_STATIC_COMMERCIAL_PATHS = [
  "/",
  "/san-pham",
  "/blog",
  "/nguon-hang",
  "/oem",
  "/dai-ly",
  "/lien-he",
  "/qua-tang-doanh-nghiep",
  "/chinh-sach-dai-ly",
  "/gift-set-doanh-nghiep",
  "/bang-mau-ao-thun-tron",
  "/size-ao-thun-tron",
  "/vai-cotton-2-chieu",
  "/vai-cvc-la-gi",
  "/vai-tc-la-gi",
  "/kho-ao-thun-tron",
  "/ao-thun-tron-si",
  "/nguon-hang-ao-thun-tron",
  "/kho-ao-polo-tron",
  "/ao-polo-tron-si",
  "/ao-thun-cong-ty",
  "/ao-thun-su-kien",
  "/ao-thun-team-building",
  "/ao-thun-nhan-vien",
  "/ao-thun-doanh-nghiep",
] as const;

export function normalizeCategorySlug(slug: string): string {
  return slug.trim().toLowerCase();
}

export function isIndexableCategoryLanding(slug: string | null | undefined): boolean {
  if (!slug?.trim()) return false;
  return INDEXABLE_CATEGORY_LANDING_SLUGS.has(normalizeCategorySlug(slug));
}

export function isReservedStaticPublicSlug(slug: string): boolean {
  return RESERVED_STATIC_PUBLIC_SLUGS.has(normalizeCategorySlug(slug));
}

export function resolveCatalogCategoryCanonicalPath(categorySlug: string | null): string | null {
  if (!categorySlug?.trim()) return null;
  const normalized = normalizeCategorySlug(categorySlug);
  if (!isIndexableCategoryLanding(normalized)) return null;
  return `/${normalized}`;
}
