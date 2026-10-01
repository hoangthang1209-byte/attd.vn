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
        className="btn-secondary home-hero-v4__secondary"
      >
        {hero.secondaryCtaLabel}
      </TrackedLink>
    );
  }

  return (
    <Link href={hero.secondaryCtaUrl} className="btn-secondary home-hero-v4__secondary">
      {hero.secondaryCtaLabel}
    </Link>
  );
}

const DECISIONS = [
  { href: "/san-pham", index: "01", title: "Tìm hàng có sẵn", copy: "Duyệt sản phẩm, màu, MOQ và khả năng hoàn thiện." },
  { href: "/oem", index: "02", title: "Sản xuất OEM", copy: "Phát triển mẫu, nhãn, đóng gói và cấu hình riêng." },
  { href: "/qua-tang-doanh-nghiep", index: "03", title: "Quà tặng doanh nghiệp", copy: "Nguồn hàng và hoàn thiện thương hiệu theo dự án." },
  { href: "/dai-ly", index: "04", title: "Dành cho đại lý", copy: "Nguồn hàng, dữ liệu sản phẩm và hỗ trợ bán hàng B2B." },
] as const;

export default function HomeHeroSection({ hero, categories, heroMedia }: Props) {
  return (
    <section className="home-hero home-hero--v4" aria-labelledby="home-hero-title">
      <div className="container">
        <div className="home-hero-v4__frame">
          <div className="home-hero-v4__copy">
            <p className="home-hero__eyebrow">{hero.eyebrow}</p>
            <h1 id="home-hero-title" className="home-hero-v4__title">
              {hero.heading}
            </h1>
            <p className="home-hero-v4__body">{hero.description}</p>

            <div className="home-hero-v4__actions">
              <Link href={hero.primaryCtaUrl} className="btn-primary home-hero-v4__primary">
                {hero.primaryCtaLabel}
              </Link>
              <HeroSecondaryCta hero={hero} />
            </div>

            <dl className="home-hero-v4__facts" aria-label="Năng lực ATTD">
              <div>
                <dt>Vận hành</dt>
                <dd>Kho · QC · đóng gói tại TP.HCM</dd>
              </div>
              <div>
                <dt>Hoàn thiện</dt>
                <dd>In · thêu · nhãn · OEM</dd>
              </div>
              <div>
                <dt>Phạm vi</dt>
                <dd>Đơn hàng B2B toàn quốc</dd>
              </div>
            </dl>
          </div>

          <div className="home-hero-v4__media" aria-label="Hình ảnh thực tế ATTD">
            {heroMedia ? (
              <Image
                src={heroMedia.url}
                alt={heroMedia.alt}
                fill
                priority
                className="home-hero-v4__media-image"
                sizes="(max-width: 900px) 100vw, 50vw"
              />
            ) : (
              <div className="home-hero-v4__media-fallback">
                <span>ATTD</span>
                <small>Đồng phục · Quà tặng · OEM</small>
              </div>
            )}
            <div className="home-hero-v4__media-caption">
              <span>ATTD / B2B SOURCING</span>
              <strong>Nguồn hàng &amp; sản xuất theo yêu cầu</strong>
            </div>
          </div>
        </div>

        <nav className="home-decision-dock" aria-label="Chọn nhu cầu chính">
          {DECISIONS.map((item) => (
            <Link key={item.href} href={item.href} className="home-decision-dock__item">
              <span className="home-decision-dock__index">{item.index}</span>
              <span className="home-decision-dock__content">
                <strong>{item.title}</strong>
                <small>{item.copy}</small>
              </span>
              <span className="home-decision-dock__arrow" aria-hidden>↗</span>
            </Link>
          ))}
        </nav>

        <HomeCategoryDiscoveryRail categories={categories} />
      </div>
    </section>
  );
}
