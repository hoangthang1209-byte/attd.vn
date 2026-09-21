export type CatalogSortOption = "newest" | "name";

export function parseCatalogSort(value?: string | null): CatalogSortOption {
  if (value === "name") return "name";
  return "newest";
}

export function catalogSortOrderBy(sort: CatalogSortOption) {
  if (sort === "name") {
    return { name: "asc" as const };
  }
  return { createdAt: "desc" as const };
}
