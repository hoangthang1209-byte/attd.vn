/**
 * Canonical public URL for browsing a product category in the marketplace catalog.
 * Routes to `/san-pham` with the category filter query param.
 */
export function publicCategoryHref(slug: string): string {
  const normalized = slug.trim();
  if (!normalized) return "/san-pham";
  return `/san-pham?category=${encodeURIComponent(normalized)}`;
}
