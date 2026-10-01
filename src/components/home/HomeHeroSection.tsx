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
        className="btn-secondary home-hero-v5__secondary"
      >
        {hero.secondaryCtaLabel}
      </TrackedLink>
    );
  }

  return (
    <Link href={hero.secondaryCtaUrl} className="btn-secondary home-hero-v5__secondary">
      {hero.secondaryCtaLabel}
    </Link>
  );
}

const HERO_PATHS = [
  { href: "/san-pham?inStock=1", label: "Hàng có sẵn" },
  { href: "/oem", label: "OEM / Private Label" },
  { href: "/qua-tang-doanh-nghiep", label: "Quà tặng doanh nghiệp" },
  { href: "/dai-ly", label: "Đại lý & Agency" },
] as const;

export default function HomeHeroSection({ hero, categories, heroMedia }: Props) {
  return (
    <section className="home-hero home-hero--v5" aria-labelledby="home-hero-title">
      <div className="container">
        <div className="home-hero-v5__layout">
          <div className="home-hero-v5__content">
            <div className="home-hero-v5__copy">
              <p className="home-hero-v5__eyebrow">{hero.eyebrow}</p>
              <h1 id="home-hero-title" className="home-hero-v5__title">
                {hero.heading}
              </h1>
              <p className="home-hero-v5__body">{hero.description}</p>

              <div className="home-hero-v5__actions">
                <Link href={hero.primaryCtaUrl} className="btn-primary home-hero-v5__primary">
                  {hero.primaryCtaLabel}
                </Link>
                <HeroSecondaryCta hero={hero} />
              </div>
            </div>

            <div className="home-hero-v5__proof">
              <span>Kho &amp; QC tại TP.HCM</span>
              <span>In · Thêu · OEM</span>
              <span>Giao hàng toàn quốc</span>
            </div>
          </div>

          <div className="home-hero-v5__visual" aria-label="Hình ảnh thực tế ATTD">
            {heroMedia ? (
              <Image
                src={heroMedia.url}
                alt={heroMedia.alt}
                fill
                priority
                className="home-hero-v5__image"
                sizes="(max-width: 900px) 100vw, 54vw"
              />
            ) : (
              <div className="home-hero-v5__fallback">
                <strong>ATTD</strong>
                <span>Đồng phục · Quà tặng · OEM</span>
              </div>
            )}

            <div className="home-hero-v5__visual-note">
              <span>ATTD · B2B</span>
              <strong>Nguồn hàng và sản xuất theo yêu cầu</strong>
            </div>
          </div>
        </div>

        <nav className="home-hero-v5__paths" aria-label="Nhu cầu chính">
          <span className="home-hero-v5__paths-label">Bạn đang cần</span>
          <div className="home-hero-v5__paths-links">
            {HERO_PATHS.map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label}
                <span aria-hidden>↗</span>
              </Link>
            ))}
          </div>
        </nav>

        <HomeCategoryDiscoveryRail categories={categories} />
      </div>
    </section>
  );
}
