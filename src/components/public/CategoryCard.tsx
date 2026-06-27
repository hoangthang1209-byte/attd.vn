import Link from "next/link";
import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import { Package } from "lucide-react";
import { isValidImageSrc } from "@/lib/imagePaths";
import { publicCategoryHref } from "@/features/categories/public-category-url";

type CategoryCardProps = {
  name: string;
  slug: string;
  /** Override link target — defaults to /{slug} collection page */
  href?: string;
  icon?: LucideIcon;
  imageUrl?: string | null;
  count?: number;
  description?: string;
  /** Muted parent label for child category cards. */
  parentName?: string | null;
  /** Visual style: grid = homepage, marketplace = image-first minimal, compact = legacy icon */
  variant?: "grid" | "marketplace" | "compact";
  ctaLabel?: string;
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
  href,
  icon: Icon = Package,
  imageUrl,
  count,
  description,
  parentName,
  variant = "compact",
  ctaLabel = "Xem nguồn hàng",
}: CategoryCardProps) {
  const hasImage = imageUrl && isValidImageSrc(imageUrl);
  const gradient = CATEGORY_GRADIENTS[slug] ?? "linear-gradient(135deg, #374151 0%, #111827 100%)";

  const cardHref = href ?? publicCategoryHref(slug);

  if (variant === "grid" || variant === "marketplace") {
    const countLabel =
      count != null && count > 0 ? `${count}+ lựa chọn` : undefined;

    return (
      <Link href={cardHref} className="market-cat-card market-cat-card--marketplace">
        <div className="market-cat-card-img">
          {hasImage ? (
            <Image
              src={imageUrl}
              alt={name}
              fill
              className="market-cat-card-photo"
              sizes="(max-width: 640px) 50vw, 280px"
            />
          ) : (
            <div
              className="market-cat-card-gradient"
              style={{ background: gradient }}
              aria-hidden
            />
          )}
        </div>
        <div className="market-cat-card-body market-cat-card-body--minimal">
          <h3 className="market-cat-card-name">{name}</h3>
          {parentName && (
            <p className="market-cat-card-parent">Thuộc: {parentName}</p>
          )}
          {countLabel && <p className="market-cat-card-count-label">{countLabel}</p>}
        </div>
      </Link>
    );
  }

  return (
    <Link href={publicCategoryHref(slug)} className="category-card">
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
