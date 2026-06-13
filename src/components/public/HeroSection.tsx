import Link from "next/link";
import TrackedLink from "@/components/analytics/TrackedLink";
import { HERO_MOSAIC } from "@/lib/siteContent";
import { CTA } from "@/lib/ctaConfig";

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
              <TrackedLink
                href={CTA.primary.href}
                trackEvent={CTA.primary.event}
                trackSource="HOMEPAGE"
                className="btn-primary"
              >
                {CTA.primary.label}
              </TrackedLink>
              <TrackedLink
                href={CTA.secondary.href}
                trackEvent={CTA.secondary.event}
                trackSource="HOMEPAGE"
                className="btn-secondary"
              >
                {CTA.secondary.label}
              </TrackedLink>
              <Link href={CTA.tertiary.href} className="btn-tertiary">
                {CTA.tertiary.label}
              </Link>
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
