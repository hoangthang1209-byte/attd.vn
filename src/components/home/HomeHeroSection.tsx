import Link from "next/link";
import Image from "next/image";
import TrackedLink from "@/components/analytics/TrackedLink";
import HomeProofStrip from "@/components/home/HomeProofStrip";
import type { HomepageHeroProductImage } from "@/features/home/homepage.types";
import { isValidImageSrc } from "@/lib/imagePaths";

type Props = {
  heroProductImages: HomepageHeroProductImage[];
};

export default function HomeHeroSection({ heroProductImages }: Props) {
  const validImages = heroProductImages.filter(
    (item) => item.imageUrl && isValidImageSrc(item.imageUrl),
  );
  const hasVisual = validImages.length >= 2;
  const tiles = validImages.slice(0, 4);

  return (
    <>
      <section className="home-hero" aria-labelledby="home-hero-title">
        <div className="container">
          <div className="home-hero__grid">
            <div className="home-hero__copy">
              <p className="home-hero__eyebrow">Nền tảng nguồn hàng B2B</p>
              <h1 id="home-hero-title" className="home-hero__title">
                Nguồn hàng đồng phục &amp; quà tặng cho doanh nghiệp
              </h1>
              <p className="home-hero__body">
                Khám phá sản phẩm sẵn kho, đặt OEM theo yêu cầu và kết nối nguồn hàng phù
                hợp cho đơn vị của bạn.
              </p>
              <div className="home-hero__cta">
                <Link href="#home-categories" className="btn-primary home-hero__cta-primary">
                  Khám phá nguồn hàng
                </Link>
                <TrackedLink
                  href="/lien-he"
                  trackEvent="contact_quote"
                  trackSource="HERO"
                  className="btn-secondary home-hero__cta-secondary"
                >
                  Liên hệ báo giá sỉ
                </TrackedLink>
              </div>
            </div>

            {hasVisual ? (
              <div
                className={`home-hero__visual home-hero__visual--products home-hero__visual--count-${tiles.length}`}
                aria-label="Sản phẩm nổi bật"
              >
                {tiles.map((item, index) => (
                  <Link
                    key={item.slug}
                    href={item.href}
                    className={`home-hero__tile${index === 0 ? " home-hero__tile--featured" : ""}`}
                  >
                    <Image
                      src={item.imageUrl}
                      alt={item.imageAlt}
                      fill
                      className="home-hero__tile-img"
                      sizes={
                        index === 0
                          ? "(max-width: 768px) 100vw, 480px"
                          : "(max-width: 768px) 45vw, 220px"
                      }
                      priority={index === 0}
                    />
                    <span className="home-hero__tile-label">{item.label}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="home-hero__visual home-hero__visual--editorial" aria-hidden>
                <div className="home-hero__editorial-surface home-hero__editorial-surface--primary" />
                <div className="home-hero__editorial-surface home-hero__editorial-surface--secondary" />
                <div className="home-hero__editorial-accent" />
              </div>
            )}
          </div>
        </div>
      </section>

      <HomeProofStrip />
    </>
  );
}
