export type CatalogFilters = {
  category?: string;
  q?: string;
  inStock?: boolean;
  print?: boolean;
  embroidery?: boolean;
  oem?: boolean;
  material?: string;
};

export function buildCatalogUrl(
  filters: CatalogFilters,
  options?: { page?: number },
): string {
  const p = new URLSearchParams();
  if (filters.category) p.set("category", filters.category);
  if (filters.q) p.set("q", filters.q);
  if (filters.inStock) p.set("inStock", "1");
  if (filters.print) p.set("print", "1");
  if (filters.embroidery) p.set("embroidery", "1");
  if (filters.oem) p.set("oem", "1");
  if (filters.material) p.set("material", filters.material);
  if (options?.page && options.page > 1) p.set("page", String(options.page));
  const qs = p.toString();
  return `/san-pham${qs ? `?${qs}` : ""}`;
}

export function countActiveCatalogFilters(
  filters: Pick<
    CatalogFilters,
    "category" | "inStock" | "print" | "embroidery" | "oem" | "material"
  >,
): number {
  let count = 0;
  if (filters.category) count += 1;
  if (filters.inStock) count += 1;
  if (filters.print) count += 1;
  if (filters.embroidery) count += 1;
  if (filters.oem) count += 1;
  if (filters.material) count += 1;
  return count;
}

export function hasActiveCatalogFilters(filters: CatalogFilters): boolean {
  return countActiveCatalogFilters(filters) > 0;
}

export function buildClearFiltersUrl(q?: string): string {
  return buildCatalogUrl({ q: q || undefined });
}

export function removeCatalogFilterParam(
  filters: CatalogFilters,
  key: "category" | "inStock" | "print" | "embroidery" | "oem" | "material",
): string {
  const next = { ...filters };
  if (key === "category") delete next.category;
  else if (key === "material") delete next.material;
  else delete next[key];
  return buildCatalogUrl(next);
}
