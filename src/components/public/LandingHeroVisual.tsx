import Link from "next/link";
import Image from "next/image";
import { isValidImageSrc } from "@/lib/imagePaths";

type LandingHeroVisualProps = {
  title: string;
  description?: string;
  eyebrow?: string;
  imageUrl?: string;
  primaryCta?: { href: string; label: string };
  secondaryCta?: { href: string; label: string };
  dark?: boolean;
};

export default function LandingHeroVisual({
  title,
  description,
  eyebrow,
  imageUrl,
  primaryCta,
  secondaryCta,
  dark = true,
}: LandingHeroVisualProps) {
  const hasImage = imageUrl && isValidImageSrc(imageUrl);

  return (
    <section className={`landing-hero${dark ? " landing-hero--dark" : ""}`}>
      <div className="container">
        <div className="landing-hero-grid">
          <div className="landing-hero-copy">
            {eyebrow && <p className="landing-hero-eyebrow">{eyebrow}</p>}
            <h1 className="landing-hero-title">{title}</h1>
            {description && (
              <p className="landing-hero-desc">{description}</p>
            )}
            {(primaryCta || secondaryCta) && (
              <div className="landing-hero-ctas">
                {primaryCta && (
                  <Link href={primaryCta.href} className="btn-primary">
                    {primaryCta.label}
                  </Link>
                )}
                {secondaryCta && (
                  <Link href={secondaryCta.href} className="btn-secondary">
                    {secondaryCta.label}
                  </Link>
                )}
              </div>
            )}
          </div>
          <div className="landing-hero-visual">
            {hasImage ? (
              <Image
                src={imageUrl}
                alt={title}
                fill
                className="landing-hero-photo"
                sizes="(max-width: 900px) 100vw, 560px"
                priority
              />
            ) : (
              <div className="landing-hero-placeholder" aria-hidden>
                <span>ATTD</span>
                <span className="landing-hero-placeholder-sub">B2B Sourcing</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
