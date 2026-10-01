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
        className="home-hero-v6__text-link"
      >
        {hero.secondaryCtaLabel}
        <span aria-hidden>↗</span>
      </TrackedLink>
    );
  }

  return (
    <Link href={hero.secondaryCtaUrl} className="home-hero-v6__text-link">
      {hero.secondaryCtaLabel}
      <span aria-hidden>↗</span>
    </Link>
  );
}

const HERO_PATHS = [
  { href: "/san-pham?inStock=1", index: "01", label: "Hàng có sẵn" },
  { href: "/oem", index: "02", label: "OEM / Nhãn riêng" },
  { href: "/qua-tang-doanh-nghiep", index: "03", label: "Quà tặng doanh nghiệp" },
  { href: "/dai-ly", index: "04", label: "Đại lý & Agency" },
] as const;

export default function HomeHeroSection({ hero, categories, heroMedia }: Props) {
  return (
    <section className="home-hero home-hero--v6" aria-labelledby="home-hero-title">
      <div className="container">
        <div className="home-hero-v6__topline">
          <span>ATTD® · TP.HCM</span>
          <span>Nguồn hàng · Đồng phục · OEM</span>
        </div>

        <div className="home-hero-v6__stage">
          <div className="home-hero-v6__visual" aria-label="Hình ảnh thực tế ATTD">
            {heroMedia ? (
              <Image
                src={heroMedia.url}
                alt={heroMedia.alt}
                fill
                priority
                className="home-hero-v6__image"
                sizes="(max-width: 760px) 100vw, 62vw"
              />
            ) : (
              <div className="home-hero-v6__fallback">
                <strong>ATTD</strong>
                <span>Đồng phục · Quà tặng · OEM</span>
              </div>
            )}

            <div className="home-hero-v6__image-label">
              <span>01 / HÌNH ẢNH THỰC TẾ</span>
              <strong>Kho · QC · hoàn thiện tại TP.HCM</strong>
            </div>
          </div>

          <div className="home-hero-v6__copy">
            <p className="home-hero-v6__eyebrow">{hero.eyebrow}</p>
            <h1 id="home-hero-title" className="home-hero-v6__title">
              {hero.heading}
            </h1>
            <p className="home-hero-v6__body">{hero.description}</p>

            <div className="home-hero-v6__actions">
              <Link href={hero.primaryCtaUrl} className="home-hero-v6__primary">
                {hero.primaryCtaLabel}
                <span aria-hidden>↗</span>
              </Link>
              <HeroSecondaryCta hero={hero} />
            </div>

            <div className="home-hero-v6__capabilities" aria-label="Năng lực ATTD">
              <span>In</span>
              <span>Thêu</span>
              <span>OEM</span>
              <span>Đóng gói</span>
            </div>
          </div>
        </div>

        <nav className="home-hero-v6__paths" aria-label="Chọn nhu cầu">
          <span className="home-hero-v6__paths-title">Bắt đầu theo nhu cầu</span>
          <div className="home-hero-v6__path-grid">
            {HERO_PATHS.map((item) => (
              <Link key={item.href} href={item.href} className="home-hero-v6__path">
                <span>{item.index}</span>
                <strong>{item.label}</strong>
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
