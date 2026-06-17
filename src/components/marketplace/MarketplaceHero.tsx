import Link from "next/link";
import Image from "next/image";
import TrackedLink from "@/components/analytics/TrackedLink";
import MarketplaceSearchBar from "@/components/marketplace/MarketplaceSearchBar";
import MarketplaceTrustStrip from "@/components/marketplace/MarketplaceTrustStrip";
import { CTA } from "@/lib/ctaConfig";
import { isValidImageSrc } from "@/lib/imagePaths";

export type MarketplaceHeroTile = {
  slug: string;
  label: string;
  description: string;
  imageUrl?: string | null;
  href?: string;
};

type MarketplaceHeroProps = {
  tiles?: MarketplaceHeroTile[];
};

const FALLBACK_TILES: MarketplaceHeroTile[] = [
  { slug: "ao-thun-tron", label: "Áo thun trơn", description: "Blank cotton & CVC", href: "/ao-thun-tron" },
  { slug: "ao-polo-tron", label: "Áo polo trơn", description: "Pique đồng phục", href: "/ao-polo-tron" },
  { slug: "non", label: "Nón đồng phục", description: "Snapback & bucket", href: "/non" },
  { slug: "tote", label: "Tote bag", description: "Canvas quà tặng", href: "/tote" },
];

const GRADIENT_MAP: Record<string, string> = {
  "ao-thun-tron": "linear-gradient(145deg, #dc2626 0%, #7f1d1d 100%)",
  "ao-polo-tron": "linear-gradient(145deg, #1d4ed8 0%, #1e3a8a 100%)",
  non: "linear-gradient(145deg, #16a34a 0%, #14532d 100%)",
  tote: "linear-gradient(145deg, #d97706 0%, #78350f 100%)",
  "binh-giu-nhiet": "linear-gradient(145deg, #0891b2 0%, #164e63 100%)",
  bandana: "linear-gradient(145deg, #7c3aed 0%, #4c1d95 100%)",
};

export default function MarketplaceHero({ tiles }: MarketplaceHeroProps) {
  const items = tiles?.length ? tiles.slice(0, 4) : FALLBACK_TILES;

  return (
    <section className="mp-hero">
      <div className="container">
        <div className="mp-hero-grid">
          <div className="mp-hero-copy">
            <p className="mp-hero-kicker">Kho nguồn hàng B2B</p>
            <h1 className="mp-hero-title">
              Kho sỉ đồng phục &amp; quà tặng doanh nghiệp
            </h1>
            <p className="mp-hero-desc">
              Nguồn hàng B2B cho đại lý đồng phục, agency quà tặng, xưởng
              in/thêu và doanh nghiệp mua số lượng lớn.
            </p>

            <MarketplaceSearchBar
              size="large"
              placeholder="Tìm nguồn hàng: áo thun trơn, polo, nón, tote, bình giữ nhiệt…"
              className="mp-hero-search"
            />

            <div className="mp-hero-cta">
              <Link href="/san-pham" className="btn-primary">
                Xem danh mục sản phẩm
              </Link>
              <TrackedLink
                href="/lien-he"
                trackEvent="contact_quote"
                trackSource="HERO"
                className="btn-secondary"
              >
                Liên hệ báo giá sỉ
              </TrackedLink>
              <Link href={CTA.primary.href} className="btn-tertiary mp-hero-cta-tertiary">
                Đăng ký đại lý
              </Link>
            </div>

            <MarketplaceTrustStrip />
          </div>

          <div className="mp-hero-visual" aria-label="Sản phẩm nổi bật">
            {items.map((item, i) => {
              const hasImg = item.imageUrl && isValidImageSrc(item.imageUrl);
              const bg = GRADIENT_MAP[item.slug] ?? "linear-gradient(145deg, #374151, #111827)";
              const href = item.href ?? `/${item.slug}`;
              const isFeatured = i === 0;

              return (
                <Link
                  key={`${item.slug}-${i}`}
                  href={href}
                  className={`mp-hero-tile${isFeatured ? " mp-hero-tile--featured" : ""}`}
                >
                  {hasImg ? (
                    <Image
                      src={item.imageUrl!}
                      alt={item.label}
                      fill
                      className="mp-hero-tile-img"
                      sizes={isFeatured ? "(max-width: 768px) 100vw, 420px" : "200px"}
                      priority={isFeatured}
                    />
                  ) : (
                    <div className="mp-hero-tile-fallback" style={{ background: bg }} aria-hidden />
                  )}
                  <div className="mp-hero-tile-overlay" />
                  <div className="mp-hero-tile-body">
                    <span className="mp-hero-tile-label">{item.label}</span>
                    <span className="mp-hero-tile-desc">{item.description}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
