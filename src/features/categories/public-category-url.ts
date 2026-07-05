import { isIndexableCategoryLanding } from "@/lib/seo/indexable-category-routes";

/**
 * Public URL for browsing a product category.
 * Indexable commercial landings use `/{slug}`; others use catalog filter query.
 */
export function publicCategoryHref(slug: string): string {
  const normalized = slug.trim();
  if (!normalized) return "/san-pham";
  if (isIndexableCategoryLanding(normalized)) {
    return `/${encodeURIComponent(normalized)}`;
  }
  return `/san-pham?category=${encodeURIComponent(normalized)}`;
}
