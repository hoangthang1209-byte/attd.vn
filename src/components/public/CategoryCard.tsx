import Link from "next/link";
import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import { Package } from "lucide-react";
import { isValidImageSrc } from "@/lib/imagePaths";

type CategoryCardProps = {
  name: string;
  slug: string;
  icon?: LucideIcon;
  imageUrl?: string | null;
  count?: number;
  description?: string;
  /** Visual style: "grid" = homepage marketplace, "compact" = legacy icon */
  variant?: "grid" | "compact";
};

const CATEGORY_GRADIENTS: Record<string, string> = {
  "ao-thun-tron": "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)",
  "ao-polo-tron": "linear-gradient(135deg, #1d4ed8 0%, #1e3a8a 100%)",
  non: "linear-gradient(135deg, #16a34a 0%, #14532d 100%)",
  tote: "linear-gradient(135deg, #d97706 0%, #92400e 100%)",
  bandana: "linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)",
  "binh-giu-nhiet": "linear-gradient(135deg, #0891b2 0%, #164e63 100%)",
  "qua-tang-doanh-nghiep": "linear-gradient(135deg, #be185d 0%, #831843 100%)",
  oem: "linear-gradient(135deg, #374151 0%, #111827 100%)",
};

export default function CategoryCard({
  name,
  slug,
  icon: Icon = Package,
  imageUrl,
  count,
  description,
  variant = "compact",
}: CategoryCardProps) {
  const hasImage = imageUrl && isValidImageSrc(imageUrl);
  const gradient = CATEGORY_GRADIENTS[slug] ?? "linear-gradient(135deg, #374151 0%, #111827 100%)";

  if (variant === "grid") {
    return (
      <Link href={`/${slug}`} className="market-cat-card">
        <div className="market-cat-card-img">
          {hasImage ? (
            <Image
              src={imageUrl}
              alt={name}
              fill
              className="market-cat-card-photo"
              sizes="(max-width: 640px) 50vw, 200px"
            />
          ) : (
            <div
              className="market-cat-card-gradient"
              style={{ background: gradient }}
              aria-hidden
            />
          )}
          <div className="market-cat-card-overlay" />
        </div>
        <div className="market-cat-card-body">
          <h3 className="market-cat-card-name">{name}</h3>
          {description && (
            <p className="market-cat-card-desc">{description}</p>
          )}
          <div className="market-cat-card-footer">
            {count != null && (
              <span className="market-cat-card-count">{count} sản phẩm</span>
            )}
            <span className="market-cat-card-cta">Xem →</span>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link href={`/${slug}`} className="category-card">
      <div className="category-card-icon" aria-hidden>
        <Icon size={26} strokeWidth={1.65} />
      </div>
      <div className="category-card-body">
        <h3 className="category-card-title">{name}</h3>
        <span className="category-card-cta">Xem danh mục →</span>
      </div>
    </Link>
  );
}
