"use client";

import Link from "next/link";
import Image from "next/image";
import TrackedLink from "@/components/analytics/TrackedLink";
import MarketplaceSearchBar from "@/components/marketplace/MarketplaceSearchBar";
import MarketplaceCategoryChips from "@/components/marketplace/MarketplaceCategoryChips";
import { isValidImageSrc } from "@/lib/imagePaths";

export type MarketplaceHeroTile = {
  slug: string;
  label: string;
  imageUrl?: string | null;
  href?: string;
  variant?: "featured" | "sm";
};

type MarketplaceHeroProps = {
  tiles?: MarketplaceHeroTile[];
};

const HERO_MOSAIC: MarketplaceHeroTile[] = [
  { slug: "ao-thun-tron", label: "Áo thun trơn", variant: "featured", href: "/ao-thun-tron" },
  { slug: "ao-polo-tron", label: "Polo", variant: "sm", href: "/ao-polo-tron" },
  { slug: "tote", label: "Tote", variant: "sm", href: "/tote" },
  { slug: "non", label: "Nón", variant: "sm", href: "/non" },
  { slug: "binh-giu-nhiet", label: "Bình giữ nhiệt", variant: "sm", href: "/binh-giu-nhiet" },
];

const GRADIENT_MAP: Record<string, string> = {
  "ao-thun-tron": "linear-gradient(145deg, #dc2626 0%, #7f1d1d 100%)",
  "ao-polo-tron": "linear-gradient(145deg, #1d4ed8 0%, #1e3a8a 100%)",
  non: "linear-gradient(145deg, #16a34a 0%, #14532d 100%)",
  tote: "linear-gradient(145deg, #d97706 0%, #78350f 100%)",
  "binh-giu-nhiet": "linear-gradient(145deg, #0891b2 0%, #164e63 100%)",
};

export default function MarketplaceHero({ tiles }: MarketplaceHeroProps) {
  const items = tiles?.length ? tiles.slice(0, 5) : HERO_MOSAIC;

  return (
    <section className="mp-hero mp-hero--v251">
      <div className="container">
        <div className="mp-hero-grid">
          <div className="mp-hero-copy">
            <p className="mp-hero-kicker">Kho nguồn hàng B2B</p>
            <h1 className="mp-hero-title">
              Kho sỉ đồng phục &amp; quà tặng doanh nghiệp
            </h1>
            <p className="mp-hero-desc mp-hero-desc--desktop">
              Nguồn hàng B2B cho đại lý, agency, xưởng in/thêu và doanh nghiệp.
            </p>

            <MarketplaceSearchBar
              size="large"
              placeholder="Tìm áo thun, polo, nón, tote, bình giữ nhiệt…"
              className="mp-hero-search"
            />

            <div className="mp-hero-cta mp-hero-cta--dual">
              <Link href="/san-pham" className="btn-primary">
                Xem sản phẩm
              </Link>
              <TrackedLink
                href="/lien-he"
                trackEvent="contact_quote"
                trackSource="HERO"
                className="btn-secondary"
              >
                Liên hệ báo giá
              </TrackedLink>
            </div>
          </div>

          <div className="mp-hero-mosaic" aria-label="Danh mục nổi bật">
            {items.map((item, i) => {
              const hasImg = item.imageUrl && isValidImageSrc(item.imageUrl);
              const bg = GRADIENT_MAP[item.slug] ?? "linear-gradient(145deg, #374151, #111827)";
              const href = item.href ?? `/${item.slug}`;
              const isFeatured = item.variant === "featured" || i === 0;

              return (
                <Link
                  key={`${item.slug}-${i}`}
                  href={href}
                  className={`mp-hero-mosaic-tile${isFeatured ? " mp-hero-mosaic-tile--featured" : ""}`}
                >
                  {hasImg ? (
                    <Image
                      src={item.imageUrl!}
                      alt={item.label}
                      fill
                      className="mp-hero-mosaic-img"
                      sizes={isFeatured ? "(max-width: 768px) 100vw, 480px" : "240px"}
                      priority={isFeatured}
                    />
                  ) : (
                    <div className="mp-hero-mosaic-fallback" style={{ background: bg }} aria-hidden />
                  )}
                  <div className="mp-hero-mosaic-overlay" />
                  <span className="mp-hero-mosaic-label">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        <MarketplaceCategoryChips className="mp-hero-chips" />
      </div>
    </section>
  );
}
