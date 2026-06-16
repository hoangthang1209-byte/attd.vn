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
  "Số lượng tối thiểu rõ ràng",
  "Hỗ trợ in / thêu / OEM",
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
    <section className="hero-section">
      <div className="container">
        <div className="hero-grid">
          {/* ── Left: copy + CTAs ───────────────────────────────────────── */}
          <div className="hero-content">
            <p className="hero-eyebrow">B2B SOURCING PLATFORM</p>
            <h1 className="hero-headline">
              KHO SỈ ĐỒNG PHỤC &amp; QUÀ TẶNG DOANH NGHIỆP
            </h1>
            <p className="hero-subheadline">
              Nguồn hàng B2B cho đại lý đồng phục, agency quà tặng, xưởng
              in/thêu và doanh nghiệp mua số lượng lớn trên toàn quốc.
            </p>

            {/* Trust chips */}
            <div className="hero-trust-chips">
              {TRUST_CHIPS.map((chip) => (
                <span key={chip} className="hero-trust-chip">{chip}</span>
              ))}
            </div>

            <div className="hero-cta-row">
              <Link href="/san-pham" className="btn-primary">
                Xem danh mục sản phẩm
              </Link>
              <TrackedLink
                href={CTA.primary.href}
                trackEvent={CTA.primary.event}
                trackSource="HERO"
                className="btn-secondary"
              >
                Liên hệ báo giá sỉ
              </TrackedLink>
              <Link href="/dai-ly" className="btn-tertiary">
                Đăng ký đại lý
              </Link>
            </div>
          </div>

          {/* ── Right: product image mosaic ─────────────────────────────── */}
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
                      sizes={isFirst ? "(max-width: 640px) 100vw, 340px" : "180px"}
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
