"use client";

import Link from "next/link";
import { trackHomepageViewAllCategoriesClick } from "@/lib/analytics";
import {
  HOMEPAGE_CATEGORY_CARD_LIMIT,
  PUBLIC_ALL_CATEGORIES_PATH,
} from "@/features/home/homepage-category.constants";

type Props = {
  visibleCategoryCount: number;
};

export default function HomeCategoryViewAllCta({ visibleCategoryCount }: Props) {
  function handleClick(): void {
    try {
      trackHomepageViewAllCategoriesClick({
        visible_category_count: visibleCategoryCount,
        homepage_category_limit: HOMEPAGE_CATEGORY_CARD_LIMIT,
        destination_path: PUBLIC_ALL_CATEGORIES_PATH,
      });
    } catch {
      // Analytics must never block navigation.
    }
  }

  return (
    <p className="home-category-grid__view-all">
      <Link
        href={PUBLIC_ALL_CATEGORIES_PATH}
        className="home-category-grid__view-all-link"
        onClick={handleClick}
      >
        Xem tất cả danh mục
      </Link>
    </p>
  );
}
