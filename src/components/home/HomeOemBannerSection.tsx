import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import type { HomepageOemBannerConfig } from "@/features/home/homepage.types";

type Props = {
  banner: HomepageOemBannerConfig;
};

export default function HomeOemBannerSection({ banner }: Props) {
  if (!banner.enabled) return null;
  const hasVisual = Boolean(banner.imageUrl);

  return (
    <section className="home-oem-banner" aria-labelledby="home-oem-banner-title">
      <div className="container">
        <div
          className={[
            "home-oem-banner__inner",
            hasVisual ? "home-oem-banner__inner--with-visual" : "home-oem-banner__inner--content-only",
          ].join(" ")}
        >
          <div className="home-oem-banner__content">
            <p className="home-oem-banner__eyebrow">{banner.eyebrow}</p>
            <h2 id="home-oem-banner-title" className="home-oem-banner__title">
              {banner.heading}
            </h2>
            <p className="home-oem-banner__description">{banner.description}</p>
            <Link href={banner.ctaUrl} className="home-oem-banner__cta btn-primary">
              {banner.ctaLabel}
              <ArrowRight size={18} className="home-oem-banner__cta-icon" aria-hidden />
            </Link>
          </div>

          {hasVisual ? (
            <div className="home-oem-banner__visual" aria-hidden>
              <div className="home-oem-banner__image-wrap">
                <Image
                  src={banner.imageUrl!}
                  alt={banner.imageAlt ?? banner.heading}
                  fill
                  className="home-oem-banner__image"
                  sizes="(max-width: 1024px) 100vw, 480px"
                />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
