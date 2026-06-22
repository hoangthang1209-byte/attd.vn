import Link from "next/link";
import TrackedLink from "@/components/analytics/TrackedLink";
import HomeCategoryDiscoveryRail from "@/components/home/HomeCategoryDiscoveryRail";
import HomeProofStrip from "@/components/home/HomeProofStrip";
import type { HomepageCategoryItem, HomepageHeroConfig } from "@/features/home/homepage.types";

type Props = {
  hero: HomepageHeroConfig;
  categories: HomepageCategoryItem[];
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

export default function HomeHeroSection({ hero, categories }: Props) {
  return (
    <>
      <section className="home-hero home-hero--centered" aria-labelledby="home-hero-title">
        <div className="container">
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
          </div>

          <HomeCategoryDiscoveryRail categories={categories} />
        </div>
      </section>

      <HomeProofStrip />
    </>
  );
}
