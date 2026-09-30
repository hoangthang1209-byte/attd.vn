import Image from "next/image";
import Link from "next/link";
import TrackedLink from "@/components/analytics/TrackedLink";
import HomeCategoryDiscoveryRail from "@/components/home/HomeCategoryDiscoveryRail";
import type { HomepageCategoryItem, HomepageHeroConfig } from "@/features/home/homepage.types";

type Props = {
  hero: HomepageHeroConfig;
  categories: HomepageCategoryItem[];
  heroMedia?: { url: string; alt: string } | null;
};

function HeroSecondaryCta({ hero }: { hero: HomepageHeroConfig }) {
  const isContactQuote =
    hero.secondaryCtaUrl === "/lien-he" ||
    hero.secondaryCtaUrl.startsWith("/lien-he?");

  if (isContactQuote) {
    return (
      <TrackedLink
        href={hero.secondaryCtaUrl}
        trackEvent="contact_quote"
        trackSource="HERO"
        className="btn-secondary home-hero__cta-secondary"
      >
        {hero.secondaryCtaLabel}
      </TrackedLink>
    );
  }

  return (
    <Link
      href={hero.secondaryCtaUrl}
      className="btn-secondary home-hero__cta-secondary"
    >
      {hero.secondaryCtaLabel}
    </Link>
  );
}

export default function HomeHeroSection({
  hero,
  categories,
  heroMedia,
}: Props) {
  return (
    <section className="home-hero home-hero--v3" aria-labelledby="home-hero-title">
      <div className="container">
        <div className="home-hero__grid">
          <div className="home-hero__copy">
            <p className="home-hero__eyebrow">{hero.eyebrow}</p>
            <h1 id="home-hero-title" className="home-hero__title">
              {hero.heading}
            </h1>
            <p className="home-hero__body">{hero.description}</p>

            <div className="home-hero__cta">
              <Link
                href={hero.primaryCtaUrl}
                className="btn-primary home-hero__cta-primary"
              >
                {hero.primaryCtaLabel}
              </Link>
              <HeroSecondaryCta hero={hero} />
            </div>

            <ul
              className="home-hero__commercial-proof"
              aria-label="Năng lực B2B nổi bật"
            >
              <li>Kho &amp; QC tại TP.HCM</li>
              <li>In / thêu / OEM</li>
              <li>MOQ theo nhu cầu</li>
              <li>Giao hàng toàn quốc</li>
            </ul>
          </div>

          <div className="home-hero__media" aria-label="Hình ảnh thực tế ATTD">
            {heroMedia ? (
              <Image
                src={heroMedia.url}
                alt={heroMedia.alt}
                fill
                priority
                className="home-hero__media-image"
                sizes="(max-width: 900px) 100vw, 52vw"
              />
            ) : (
              <div className="home-hero__media-fallback">
                <span>ATTD</span>
                <small>Đồng phục · Quà tặng · OEM</small>
              </div>
            )}
          </div>
        </div>

        <HomeCategoryDiscoveryRail categories={categories} />
      </div>
    </section>
  );
}
