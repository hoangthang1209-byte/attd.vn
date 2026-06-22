import Link from "next/link";
import Image from "next/image";
import { getHomepageData } from "@/features/home/homepage.service";
import { categoryDemoImages } from "@/features/demo/demo-image-map";
import HomeHeroSection from "@/components/home/HomeHeroSection";
import MarketplaceSectionHeader from "@/components/marketplace/MarketplaceSectionHeader";
import MarketplaceRFQStrip from "@/components/marketplace/MarketplaceRFQStrip";
import MarketplaceFinalCta from "@/components/marketplace/MarketplaceFinalCta";
import HomeCategoryGridSection from "@/components/home/HomeCategoryGridSection";
import HomeProductDiscoverySection from "@/components/home/HomeProductDiscoverySection";
import HomeBlogTeaserSection from "@/components/home/HomeBlogTeaserSection";
import { isValidImageSrc } from "@/lib/imagePaths";

export const revalidate = 3600;

const B2B_AUDIENCES = [
  {
    key: "dai-ly",
    title: "Đại lý đồng phục",
    href: "/dai-ly",
    imageKey: "ao-thun-tron",
  },
  {
    key: "agency",
    title: "Agency quà tặng",
    href: "/qua-tang-doanh-nghiep",
    imageKey: "tote",
  },
  {
    key: "xuong-in",
    title: "Xưởng in / thêu",
    href: "/nguon-hang",
    imageKey: "ao-polo-tron",
  },
  {
    key: "doanh-nghiep",
    title: "Doanh nghiệp",
    href: "/lien-he",
    imageKey: "binh-giu-nhiet",
  },
];

const WHY_ATTD = [
  "Danh mục dễ bán cho đại lý",
  "Số lượng tối thiểu rõ ràng",
  "Hỗ trợ in/thêu/OEM",
  "Dữ liệu sản phẩm đầy đủ",
  "Hỗ trợ đại lý & agency",
  "Giao hàng toàn quốc",
];

const SOURCING_STEPS = [
  "Chọn sản phẩm hoặc gửi yêu cầu",
  "Kiểm tra tồn kho & MOQ",
  "Tư vấn in/thêu/OEM",
  "Chốt báo giá",
  "Giao hàng / sản xuất",
];

export default async function HomePage() {
  const { hero, categories, latestProducts, blogPosts } =
    await getHomepageData();

  return (
    <main className="mp-home mp-home--v271">
      <HomeHeroSection hero={hero} categories={categories} />

      <HomeCategoryGridSection categories={categories} />

      <HomeProductDiscoverySection products={latestProducts} />

      <section className="mp-section mp-section--alt mp-section--tight">
        <div className="container">
          <MarketplaceSectionHeader title="Nguồn hàng theo nhu cầu B2B" />
          <div className="mp-audience-grid mp-audience-grid--visual">
            {B2B_AUDIENCES.map((a) => {
              const img = categoryDemoImages[a.imageKey];
              return (
                <Link key={a.key} href={a.href} className="mp-audience-card mp-audience-card--visual">
                  <div className="mp-audience-card-img">
                    {img && isValidImageSrc(img) ? (
                      <Image src={img} alt="" fill className="mp-audience-card-photo" sizes="400px" />
                    ) : (
                      <div className="mp-audience-card-fallback" aria-hidden />
                    )}
                  </div>
                  <h3 className="mp-audience-card-title">{a.title}</h3>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <MarketplaceRFQStrip />

      <section className="mp-section mp-section--tight">
        <div className="container">
          <MarketplaceSectionHeader title="Vì sao chọn nguồn hàng B2B từ ATTD?" />
          <ul className="mp-why-list">
            {WHY_ATTD.map((item) => (
              <li key={item} className="mp-why-list-item">{item}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mp-section mp-section--alt mp-section--tight">
        <div className="container">
          <MarketplaceSectionHeader title="Quy trình lấy nguồn hàng" />
          <ol className="mp-process-list">
            {SOURCING_STEPS.map((step, i) => (
              <li key={step} className="mp-process-list-item">
                <span className="mp-process-list-num">{i + 1}</span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <HomeBlogTeaserSection posts={blogPosts} />

      <MarketplaceFinalCta />
    </main>
  );
}
