"use client";

import Link from "next/link";
import TrackedLink from "@/components/analytics/TrackedLink";

type Props = {
  showClearFilters: boolean;
  clearFiltersHref: string;
};

export default function CatalogEmptyActions({ showClearFilters, clearFiltersHref }: Props) {
  return (
    <div className="mp-catalog-empty-actions">
      {showClearFilters ? (
        <Link href={clearFiltersHref} className="btn-secondary mp-catalog-empty-cta">
          Xóa bộ lọc
        </Link>
      ) : null}
      <TrackedLink
        href="/lien-he"
        trackEvent="wholesale_request_click"
        trackSource="catalog_empty"
        className="btn-primary mp-catalog-empty-cta"
      >
        Gửi yêu cầu nguồn hàng
      </TrackedLink>
      <TrackedLink
        href="/dai-ly"
        trackEvent="dealer_registration_click"
        trackSource="catalog_empty"
        className="btn-secondary mp-catalog-empty-cta"
      >
        Đăng ký đại lý
      </TrackedLink>
    </div>
  );
}
