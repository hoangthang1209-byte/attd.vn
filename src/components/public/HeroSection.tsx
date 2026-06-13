import Link from "next/link";
import TrackedLink from "@/components/analytics/TrackedLink";
import { HERO_MOSAIC } from "@/lib/siteContent";

export default function HeroSection() {
  return (
    <section className="hero-section">
      <div className="container">
        <div className="hero-grid">
          <div className="hero-content">
            <p className="hero-eyebrow">B2B SOURCING PLATFORM</p>
            <h1 className="hero-headline">
              KHO SỈ ĐỒNG PHỤC &amp; QUÀ TẶNG DOANH NGHIỆP
            </h1>
            <p className="hero-subheadline">
              Nguồn hàng dành cho đại lý, xưởng in, agency và doanh nghiệp trên
              toàn quốc. Blank apparel, gia công in thêu và giao hàng B2B.
            </p>
            <div className="hero-cta-row">
              <Link href="/nguon-hang" className="btn-primary">
                Xem nguồn hàng
              </Link>
              <TrackedLink
                href="/dai-ly"
                trackEvent="dealer_registration_click"
                trackSource="HOMEPAGE"
                className="btn-secondary"
              >
                Đăng ký đại lý
              </TrackedLink>
            </div>
          </div>

          <div className="hero-mosaic" aria-label="Danh mục nguồn hàng">
            {HERO_MOSAIC.map((item) => (
              <Link
                key={item.slug}
                href={`/${item.slug}`}
                className={`hero-mosaic-card hero-mosaic-card--${item.span}`}
              >
                <span className="hero-mosaic-label">{item.label}</span>
                <span className="hero-mosaic-desc">{item.description}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
