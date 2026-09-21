import Link from "next/link";
import TrackedLink from "@/components/analytics/TrackedLink";
import HomeCategoryDiscoveryRail from "@/components/home/HomeCategoryDiscoveryRail";
import { HOMEPAGE_PROOF_ICONS } from "@/features/home/homepage-proof-icons";
import type {
  HomepageCategoryItem,
  HomepageHeroConfig,
  HomepageProofItemConfig,
} from "@/features/home/homepage.types";

type Props = {
  hero: HomepageHeroConfig;
  categories: HomepageCategoryItem[];
  proofItems?: HomepageProofItemConfig[];
};

function HeroSecondaryCta({ hero }: { hero: HomepageHeroConfig }) {
  const isContactQuote = hero.secondaryCtaUrl === "/lien-he" || hero.secondaryCtaUrl.startsWith("/lien-he?");

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
    <Link href={hero.secondaryCtaUrl} className="btn-secondary home-hero__cta-secondary">
      {hero.secondaryCtaLabel}
    </Link>
  );
}

function HeroTrustLine({ items }: { items: HomepageProofItemConfig[] }) {
  const visible = items.filter((item) => item.enabled).sort((a, b) => a.sortOrder - b.sortOrder);
  if (visible.length === 0) return null;

  return (
    <ul className="home-hero__trust" aria-label="Điểm mạnh nguồn hàng">
      {visible.slice(0, 4).map((item) => {
        const Icon = HOMEPAGE_PROOF_ICONS[item.iconKey];
        return (
          <li key={item.itemKey} className="home-hero__trust-item">
            <Icon size={14} className="home-hero__trust-icon" aria-hidden />
            <span>{item.title}</span>
          </li>
        );
      })}
    </ul>
  );
}

export default function HomeHeroSection({ hero, categories, proofItems = [] }: Props) {
  return (
    <section className="home-hero home-hero--editorial" aria-labelledby="home-hero-title">
      <div className="container">
        <div className="home-hero__shell">
          <div className="home-hero__copy home-hero__copy--centered">
            <p className="home-hero__eyebrow">{hero.eyebrow}</p>
            <h1 id="home-hero-title" className="home-hero__title">
              {hero.heading}
            </h1>
            <p className="home-hero__body">{hero.description}</p>
            <div className="home-hero__cta home-hero__cta--centered">
              <Link href={hero.primaryCtaUrl} className="btn-primary home-hero__cta-primary">
                {hero.primaryCtaLabel}
              </Link>
              <HeroSecondaryCta hero={hero} />
            </div>
            <HeroTrustLine items={proofItems} />
          </div>
        </div>

        <HomeCategoryDiscoveryRail categories={categories} />
      </div>
    </section>
  );
}
