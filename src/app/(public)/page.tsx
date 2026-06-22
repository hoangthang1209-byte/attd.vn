import { getHomepageData } from "@/features/home/homepage.service";
import HomeHeroSection from "@/components/home/HomeHeroSection";
import HomeSourcingPathwaysSection from "@/components/home/HomeSourcingPathwaysSection";
import HomeOemBannerSection from "@/components/home/HomeOemBannerSection";
import MarketplaceSectionHeader from "@/components/marketplace/MarketplaceSectionHeader";
import MarketplaceRFQStrip from "@/components/marketplace/MarketplaceRFQStrip";
import MarketplaceFinalCta from "@/components/marketplace/MarketplaceFinalCta";
import HomeCategoryGridSection from "@/components/home/HomeCategoryGridSection";
import HomeProductDiscoverySection from "@/components/home/HomeProductDiscoverySection";
import HomeBlogTeaserSection from "@/components/home/HomeBlogTeaserSection";

export const revalidate = 3600;

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

      <HomeSourcingPathwaysSection />

      <HomeCategoryGridSection categories={categories} />

      <HomeProductDiscoverySection products={latestProducts} />

      <HomeOemBannerSection />

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
