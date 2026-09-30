import Link from "next/link";
import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import { Package } from "lucide-react";
import { isValidImageSrc } from "@/lib/imagePaths";
import { publicCategoryHref } from "@/features/categories/public-category-url";
import { formatPublicCategoryProductCountLabel } from "@/features/home/homepage-category.utils";

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

const CATEGORY_FALLBACKS: Record<string, string> = {
  oem: "linear-gradient(145deg, #18181b 0%, #27272a 100%)",
  "qua-tang-doanh-nghiep": "linear-gradient(145deg, #7f1d1d 0%, #b91c1c 100%)",
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
  const gradient =
    CATEGORY_FALLBACKS[slug] ??
    "linear-gradient(145deg, #e5e7eb 0%, #f8fafc 58%, #fecaca 100%)";

  const cardHref = href ?? publicCategoryHref(slug);

  if (variant === "grid" || variant === "marketplace") {
    const countLabel =
      count != null ? formatPublicCategoryProductCountLabel(count) : undefined;
    const countLabelIsPending = count === 0;

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
          {countLabel && (
            <p
              className={`market-cat-card-count-label${
                countLabelIsPending ? " market-cat-card-count-label--pending" : ""
              }`}
            >
              {countLabel}
            </p>
          )}
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
