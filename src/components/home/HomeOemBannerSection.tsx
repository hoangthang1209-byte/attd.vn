import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ArrowRightLeft, Layers, Package, Rocket } from "lucide-react";
import type { HomepageOemBannerConfig } from "@/features/home/homepage.types";

const OEM_FLOW_STEPS = [
  { key: "product", label: "Sản phẩm", Icon: Package },
  { key: "custom", label: "Tùy chỉnh", Icon: Layers },
  { key: "brand", label: "Thương hiệu", Icon: ArrowRightLeft },
  { key: "deploy", label: "Triển khai", Icon: Rocket },
] as const;

type Props = {
  banner: HomepageOemBannerConfig;
};

function OemFlowVisual() {
  return (
    <ol className="home-oem-banner__flow">
      {OEM_FLOW_STEPS.map(({ key, label, Icon }, index) => (
        <li key={key} className="home-oem-banner__flow-step">
          <span className="home-oem-banner__flow-node">
            <Icon size={18} className="home-oem-banner__flow-icon" />
          </span>
          <span className="home-oem-banner__flow-label">{label}</span>
          {index < OEM_FLOW_STEPS.length - 1 && <span className="home-oem-banner__flow-connector" />}
        </li>
      ))}
    </ol>
  );
}

export default function HomeOemBannerSection({ banner }: Props) {
  if (!banner.enabled) return null;

  return (
    <section className="home-oem-banner" aria-labelledby="home-oem-banner-title">
      <div className="container">
        <div className="home-oem-banner__inner">
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

          <div className="home-oem-banner__visual" aria-hidden>
            {banner.imageUrl ? (
              <div className="home-oem-banner__image-wrap">
                <Image
                  src={banner.imageUrl}
                  alt={banner.imageAlt ?? banner.heading}
                  fill
                  className="home-oem-banner__image"
                  sizes="(max-width: 1024px) 100vw, 480px"
                />
              </div>
            ) : (
              <OemFlowVisual />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
