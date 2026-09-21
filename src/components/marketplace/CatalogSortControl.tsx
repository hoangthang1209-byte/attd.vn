"use client";

import { useRouter } from "next/navigation";
import { ArrowUpDown } from "lucide-react";
import { buildCatalogUrl, type CatalogFilters } from "@/lib/catalog-filter-url";
import type { CatalogSortOption } from "@/lib/catalog-sort";

type Props = {
  filters: CatalogFilters;
  sort: CatalogSortOption;
};

const SORT_OPTIONS: Array<{ value: CatalogSortOption; label: string }> = [
  { value: "newest", label: "Mới nhất" },
  { value: "name", label: "Tên A → Z" },
];

export default function CatalogSortControl({ filters, sort }: Props) {
  const router = useRouter();

  return (
    <div className="mp-catalog-sort">
      <label htmlFor="mp-catalog-sort-select" className="mp-catalog-sort__label">
        <ArrowUpDown size={15} aria-hidden />
        Sắp xếp
      </label>
      <select
        id="mp-catalog-sort-select"
        className="mp-catalog-sort__select"
        value={sort}
        onChange={(event) => {
          const nextSort = event.target.value as CatalogSortOption;
          router.push(
            buildCatalogUrl({
              ...filters,
              sort: nextSort === "newest" ? undefined : nextSort,
            }),
          );
        }}
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
