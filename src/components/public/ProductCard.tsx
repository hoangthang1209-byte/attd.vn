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
  skuCount = 0,
  category,
  imageUrl,
  moq,
  leadTime,
  stockStatus,
  stockLabel,
  supportsPrinting,
  supportsEmbroidery,
  supportsOem,
}: ProductCardProps) {
  const hasImage = imageUrl && isValidImageSrc(imageUrl);
  const hasBadges = supportsPrinting || supportsEmbroidery || supportsOem;
  const stockColor = stockStatus ? (STOCK_COLORS[stockStatus] ?? "#6b7280") : undefined;

  return (
    <Link href={`/san-pham/${slug}`} className="product-card">
      <div className="product-card-media">
        {hasImage ? (
          <Image
            src={imageUrl}
            alt={name}
            fill
            className="product-card-img"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 280px"
          />
        ) : (
          <ImagePlaceholder
            variant="product"
            label={productCode ?? undefined}
          />
        )}

        {/* Stock badge overlay */}
        {stockLabel && stockStatus !== "IN_STOCK" && (
          <span
            className="product-card-stock-badge"
            style={{ background: stockColor }}
          >
            {stockLabel}
          </span>
        )}
      </div>

      <div className="product-card-body">
        {category && <p className="product-card-category">{category}</p>}
        <h3 className="product-card-title">{name}</h3>

        {/* B2B info row */}
        <div className="product-card-b2b">
          {skuCount > 0 && (
            <span className="product-card-meta">{skuCount} SKU</span>
          )}
          {moq != null && (
            <span className="product-card-meta">MOQ {moq}</span>
          )}
          {leadTime && (
            <span className="product-card-meta product-card-leadtime">{leadTime}</span>
          )}
        </div>

        {/* Feature badges */}
        {hasBadges && (
          <div className="product-card-badges">
            {supportsPrinting && (
              <span className="product-badge product-badge--print">In logo</span>
            )}
            {supportsEmbroidery && (
              <span className="product-badge product-badge--emb">Thêu</span>
            )}
            {supportsOem && (
              <span className="product-badge product-badge--oem">OEM</span>
            )}
          </div>
        )}

        <div className="product-card-footer">
          <span className="product-card-price">Liên hệ báo giá</span>
          <span className="product-card-link">
            Xem chi tiết
            <ArrowRight size={14} strokeWidth={2} />
          </span>
        </div>
      </div>
    </Link>
  );
}
