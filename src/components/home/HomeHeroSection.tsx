import Link from "next/link";
import TrackedLink from "@/components/analytics/TrackedLink";
import HomeCategoryDiscoveryRail from "@/components/home/HomeCategoryDiscoveryRail";
import HomeProofStrip from "@/components/home/HomeProofStrip";
import type { HomepageCategoryItem } from "@/features/home/homepage.types";

type Props = {
  categories: HomepageCategoryItem[];
};

export default function HomeHeroSection({ categories }: Props) {
  return (
    <>
      <section className="home-hero home-hero--centered" aria-labelledby="home-hero-title">
        <div className="container">
          <div className="home-hero__copy home-hero__copy--centered">
            <p className="home-hero__eyebrow">Nền tảng nguồn hàng B2B</p>
            <h1 id="home-hero-title" className="home-hero__title">
              Nguồn hàng đồng phục &amp; quà tặng cho doanh nghiệp
            </h1>
            <p className="home-hero__body">
              Khám phá sản phẩm sẵn kho, đặt OEM theo yêu cầu và kết nối nguồn hàng phù
              hợp cho đơn vị của bạn.
            </p>
            <div className="home-hero__cta home-hero__cta--centered">
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

          <HomeCategoryDiscoveryRail categories={categories} />
        </div>
      </section>

      <HomeProofStrip />
    </>
  );
}
