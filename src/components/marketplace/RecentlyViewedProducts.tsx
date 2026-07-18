"use client";

import { useEffect, useState } from "react";
import ProductDiscoveryRail from "@/components/marketplace/ProductDiscoveryRail";
import {
  RECENTLY_VIEWED_PRODUCTS_STORAGE_KEY,
  addRecentlyViewedProductSlug,
  getRenderableRecentProductSlugs,
  type ProductDiscoveryCard,
} from "@/features/products/product-discovery";

type Props = {
  currentSlug: string;
};

export default function RecentlyViewedProducts({ currentSlug }: Props) {
  const [products, setProducts] = useState<ProductDiscoveryCard[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function syncRecentlyViewed() {
      let existing: unknown = [];

      try {
        const raw = window.localStorage.getItem(RECENTLY_VIEWED_PRODUCTS_STORAGE_KEY);
        existing = raw ? JSON.parse(raw) : [];
      } catch {
        existing = [];
      }

      const renderableSlugs = getRenderableRecentProductSlugs(existing, currentSlug, 8);
      const nextHistory = addRecentlyViewedProductSlug(existing, currentSlug);

      try {
        window.localStorage.setItem(RECENTLY_VIEWED_PRODUCTS_STORAGE_KEY, JSON.stringify(nextHistory));
      } catch {
        // Private browsing or locked storage should never block PDP rendering.
      }

      if (!renderableSlugs.length) {
        if (!cancelled) setProducts([]);
        return;
      }

      try {
        const params = new URLSearchParams({ slugs: renderableSlugs.join(",") });
        const response = await fetch(`/api/public/recent-products?${params.toString()}`, {
          headers: { Accept: "application/json" },
        });
        if (!response.ok) throw new Error("recent-products failed");
        const data = (await response.json()) as { products?: ProductDiscoveryCard[] };
        if (!cancelled) setProducts(Array.isArray(data.products) ? data.products : []);
      } catch {
        if (!cancelled) setProducts([]);
      }
    }

    void syncRecentlyViewed();
    return () => {
      cancelled = true;
    };
  }, [currentSlug]);

  return (
    <ProductDiscoveryRail
      title="Sản phẩm vừa xem"
      description="Tiếp tục so sánh những sản phẩm bạn đã xem gần đây."
      products={products}
    />
  );
}
