"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import ProductMediaFrame from "@/components/public/ProductMediaFrame";
import ProductQuoteDialog from "@/components/public/ProductQuoteDialog";
import ProductSalesBadgeOverlay from "@/components/public/ProductSalesBadgeOverlay";
import type { PublicProductSalesBadge } from "@/features/products/product-sales-badges";
import { formatProductCardMoq, isPublicMoq } from "@/lib/formatMoq";

type ProductCardProps = {
  id: string;
  slug: string;
  name: string;
  productCode?: string | null;
  skuCount?: number;
  category?: string;
  imageUrl?: string | null;
  moq?: number | null;
  leadTime?: string | null;
  stockStatus?: string;
  stockLabel?: string;
  supportsPrinting?: boolean;
  supportsEmbroidery?: boolean;
  supportsOem?: boolean;
  /** Compact image-first layout for marketplace grids */
  compact?: boolean;
  salesBadges?: PublicProductSalesBadge[];
};

const STOCK_COLORS: Record<string, string> = {
  IN_STOCK: "#16a34a",
  LOW_STOCK: "#d97706",
  OUT_OF_STOCK: "#6b7280",
};

export default function ProductCard({
  id,
  slug,
  name,
  productCode,
  moq,
  leadTime,
  category,
  imageUrl,
  stockStatus,
  stockLabel,
  compact = false,
  salesBadges = [],
}: ProductCardProps) {
  const [quoteOpen, setQuoteOpen] = useState(false);
  const quoteTriggerRef = useRef<HTMLButtonElement>(null);
  const productHref = `/san-pham/${slug}`;

  const stockColor = stockStatus ? (STOCK_COLORS[stockStatus] ?? "#6b7280") : undefined;
  const moqLabel = isPublicMoq(moq) ? formatProductCardMoq(moq) : null;
  const showB2bMeta = moqLabel || leadTime;

  function openQuote(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setQuoteOpen(true);
  }

  function closeQuote() {
    setQuoteOpen(false);
  }

  return (
    <>
      <article className={`product-card${compact ? " product-card--compact" : ""}`}>
        <div className="product-card-media">
          <Link href={productHref} className="product-card-media-link">
            <ProductMediaFrame
              imageUrl={imageUrl}
              alt={name}
              placeholderLabel={productCode ?? undefined}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 280px"
              placeholderCompact={compact}
            />
          </Link>

          <ProductSalesBadgeOverlay badges={salesBadges} compact={compact} />

          {stockLabel && stockStatus !== "IN_STOCK" && (
            <span className="product-card-stock-badge" style={{ background: stockColor }}>
              {stockLabel}
            </span>
          )}
        </div>

        <div className="product-card-body">
          {category && (
            <Link href={productHref} className="product-card-category">
              {category}
            </Link>
          )}
          <h3 className="product-card-title">
            <Link href={productHref} className="product-card-title-link">
              {name}
            </Link>
          </h3>

          {showB2bMeta && (
            <div className="product-card-b2b">
              {moqLabel && <span className="product-card-meta">{moqLabel}</span>}
              {leadTime && (
                <span className="product-card-meta product-card-leadtime">{leadTime}</span>
              )}
            </div>
          )}

          <div className="product-card-footer">
            <button
              ref={quoteTriggerRef}
              type="button"
              className="product-card-quote-btn"
              onClick={openQuote}
              aria-label={`Liên hệ báo giá sỉ cho ${name}`}
            >
              Liên hệ báo giá sỉ
            </button>
            <Link href={productHref} className="product-card-link">
              Xem chi tiết
              <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </article>

      <ProductQuoteDialog
        open={quoteOpen}
        onClose={closeQuote}
        restoreFocusRef={quoteTriggerRef}
        product={{ id, slug, name, category, imageUrl, moq }}
      />
    </>
  );
}
