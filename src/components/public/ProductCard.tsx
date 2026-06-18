import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import ImagePlaceholder from "@/components/public/ImagePlaceholder";
import { isValidImageSrc } from "@/lib/imagePaths";

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
};

const STOCK_COLORS: Record<string, string> = {
  IN_STOCK: "#16a34a",
  LOW_STOCK: "#d97706",
  OUT_OF_STOCK: "#6b7280",
};

export default function ProductCard({
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
}: ProductCardProps) {
  const hasImage = imageUrl && isValidImageSrc(imageUrl);
  const stockColor = stockStatus ? (STOCK_COLORS[stockStatus] ?? "#6b7280") : undefined;

  return (
    <Link
      href={`/san-pham/${slug}`}
      className={`product-card${compact ? " product-card--compact" : ""}`}
    >
      <div className="product-card-media">
        {hasImage ? (
          <Image
            src={imageUrl}
            alt={name}
            fill
            className="product-card-img"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 280px"
          />
        ) : (
          <ImagePlaceholder variant="product" label={productCode ?? undefined} />
        )}

        {stockLabel && stockStatus !== "IN_STOCK" && (
          <span className="product-card-stock-badge" style={{ background: stockColor }}>
            {stockLabel}
          </span>
        )}
      </div>

      <div className="product-card-body">
        {category && <p className="product-card-category">{category}</p>}
        <h3 className="product-card-title">{name}</h3>

        <div className="product-card-b2b">
          {moq != null && (
            <span className="product-card-meta">Tối thiểu {moq} cái</span>
          )}
          {leadTime && (
            <span className="product-card-meta product-card-leadtime">{leadTime}</span>
          )}
        </div>

        <div className="product-card-footer">
          <span className="product-card-price">Liên hệ báo giá sỉ</span>
          {!compact && (
            <span className="product-card-link">
              Xem chi tiết
              <ArrowRight size={14} strokeWidth={2} />
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
