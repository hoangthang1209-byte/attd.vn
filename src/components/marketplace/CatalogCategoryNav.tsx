"use client";

import Link from "next/link";
import type { CatalogNavCategory } from "@/features/categories/catalog-category-nav.utils";

type Props = {
  categories: CatalogNavCategory[];
  activeSlug?: string;
  title?: string;
  /** catalog = /san-pham chips; landing = category page child rail */
  variant?: "catalog" | "landing";
};

export default function CatalogCategoryNav({
  categories,
  activeSlug,
  title = "Danh mục",
  variant = "catalog",
}: Props) {
  if (categories.length === 0) return null;

  return (
    <nav
      className={`mp-catalog-category-nav mp-catalog-category-nav--${variant}`}
      aria-label={title}
    >
      <div className="mp-catalog-category-nav__header">
        <p className="mp-catalog-category-nav__label">{title}</p>
        {variant === "catalog" ? (
          <Link href="/danh-muc-san-pham" className="mp-catalog-category-nav__all">
            Xem tất cả
          </Link>
        ) : null}
      </div>
      <div className="mp-catalog-category-nav__viewport">
        <div className="mp-catalog-category-nav__track">
          {categories.map((category) => {
            const isActive = activeSlug === category.slug;
            return (
              <Link
                key={category.id}
                href={category.href}
                className={`mp-catalog-category-nav__chip${isActive ? " mp-catalog-category-nav__chip--active" : ""}`}
                aria-current={isActive ? "page" : undefined}
              >
                <span className="mp-catalog-category-nav__chip-name">{category.name}</span>
                {category.productCount > 0 ? (
                  <span className="mp-catalog-category-nav__chip-count">{category.productCount}</span>
                ) : null}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
