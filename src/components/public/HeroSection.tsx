import Link from "next/link";
import Image from "next/image";
import TrackedLink from "@/components/analytics/TrackedLink";
import { CTA } from "@/lib/ctaConfig";
import { isValidImageSrc } from "@/lib/imagePaths";


export type HeroMosaicItem = {
  slug: string;
  label: string;
  description: string;
  imageUrl?: string | null;
};

type HeroSectionProps = {
  mosaicItems?: HeroMosaicItem[];
};

const TRUST_CHIPS = [
  "MOQ rõ ràng",
  "In/thêu/OEM",
  "Danh mục B2B đa dạng",
  "Giao hàng toàn quốc",
];

const FALLBACK_MOSAIC: HeroMosaicItem[] = [
  { slug: "ao-thun-tron", label: "Áo thun trơn", description: "Blank cotton & CVC" },
  { slug: "ao-polo-tron", label: "Áo polo trơn", description: "Pique đồng phục" },
  { slug: "non", label: "Nón đồng phục", description: "Snapback & bucket" },
  { slug: "tote", label: "Tote bag", description: "Canvas quà tặng" },
  { slug: "binh-giu-nhiet", label: "Bình giữ nhiệt", description: "Quà tặng DN" },
  { slug: "bandana", label: "Bandana", description: "Phụ kiện trơn" },
];

const GRADIENT_MAP: Record<string, string> = {
  "ao-thun-tron":        "linear-gradient(145deg, #dc2626 0%, #7f1d1d 100%)",
  "ao-polo-tron":        "linear-gradient(145deg, #1d4ed8 0%, #1e3a8a 100%)",
  non:                   "linear-gradient(145deg, #16a34a 0%, #14532d 100%)",
  tote:                  "linear-gradient(145deg, #d97706 0%, #78350f 100%)",
  "binh-giu-nhiet":      "linear-gradient(145deg, #0891b2 0%, #164e63 100%)",
  bandana:               "linear-gradient(145deg, #7c3aed 0%, #4c1d95 100%)",
};

export default function HeroSection({ mosaicItems }: HeroSectionProps) {
  const tiles = mosaicItems?.length ? mosaicItems.slice(0, 6) : FALLBACK_MOSAIC;

  return (
    <section className="hero-section hero-home">
      <div className="container">
        <div className="hero-grid">
          <div className="hero-copy">
            <p className="hero-eyebrow">
              <span className="hero-eyebrow-text hero-eyebrow-text--desktop">
                B2B SOURCING PLATFORM
              </span>
              <span className="hero-eyebrow-text hero-eyebrow-text--mobile">
                KHO NGUỒN HÀNG B2B
              </span>
            </p>
            <h1 className="hero-headline">
              KHO SỈ ĐỒNG PHỤC &amp; QUÀ TẶNG DOANH NGHIỆP
            </h1>
            <p className="hero-subheadline hero-subheadline--desktop">
              Nguồn hàng B2B cho đại lý đồng phục, agency quà tặng, xưởng
              in/thêu và doanh nghiệp mua số lượng lớn trên toàn quốc.
            </p>
            <p className="hero-subheadline hero-subheadline--mobile">
              Nguồn hàng cho đại lý, agency, xưởng in/thêu và doanh nghiệp mua
              số lượng lớn.
            </p>
          </div>

          <div className="hero-meta">
            <div className="hero-trust-chips">
              {TRUST_CHIPS.map((chip) => (
                <span key={chip} className="hero-trust-chip">{chip}</span>
              ))}
            </div>

            <div className="hero-cta-row">
              <Link href="/san-pham" className="btn-primary">
                <span className="hero-cta-label hero-cta-label--desktop">
                  Xem danh mục sản phẩm
                </span>
                <span className="hero-cta-label hero-cta-label--mobile">
                  Xem sản phẩm
                </span>
              </Link>
              <TrackedLink
                href={CTA.secondary.href}
                trackEvent={CTA.secondary.event}
                trackSource="HERO"
                className="btn-secondary"
              >
                <span className="hero-cta-label hero-cta-label--desktop">
                  Liên hệ báo giá sỉ
                </span>
                <span className="hero-cta-label hero-cta-label--mobile">
                  Liên hệ báo giá
                </span>
              </TrackedLink>
              <Link href={CTA.primary.href} className="btn-tertiary hero-dealer-cta">
                Đăng ký đại lý
              </Link>
            </div>

            <Link href={CTA.primary.href} className="hero-dealer-link">
              Đăng ký đại lý →
            </Link>
          </div>

          <div className="hero-mosaic-v2" aria-label="Danh mục sản phẩm">
            {tiles.map((item, i) => {
              const hasImg = item.imageUrl && isValidImageSrc(item.imageUrl);
              const bg = GRADIENT_MAP[item.slug] ?? "linear-gradient(145deg, #374151, #111827)";
              const isFirst = i === 0;
              return (
                <Link
                  key={item.slug}
                  href={`/${item.slug}`}
                  className={`hero-tile hero-tile--${isFirst ? "tall" : "sm"}`}
                  aria-label={item.label}
                >
                  {hasImg ? (
                    <Image
                      src={item.imageUrl!}
                      alt={item.label}
                      fill
                      className="hero-tile-img"
                      sizes={isFirst ? "(max-width: 768px) 100vw, 340px" : "180px"}
                      priority={isFirst}
                    />
                  ) : (
                    <div
                      className="hero-tile-gradient"
                      style={{ background: bg }}
                      aria-hidden
                    />
                  )}
                  <div className="hero-tile-overlay" />
                  <div className="hero-tile-content">
                    <span className="hero-tile-label">{item.label}</span>
                    <span className="hero-tile-desc">{item.description}</span>
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
