import { getHomepageData, getPreCategoryEditorialSections } from "@/features/home/homepage.service";
import HomeHeroSection from "@/components/home/HomeHeroSection";
import HomeProofStrip from "@/components/home/HomeProofStrip";
import HomeSourcingPathwaysSection from "@/components/home/HomeSourcingPathwaysSection";
import HomeOemBannerSection from "@/components/home/HomeOemBannerSection";
import MarketplaceSectionHeader from "@/components/marketplace/MarketplaceSectionHeader";
import MarketplaceRFQStrip from "@/components/marketplace/MarketplaceRFQStrip";
import MarketplaceFinalCta from "@/components/marketplace/MarketplaceFinalCta";
import HomeCategoryGridSection from "@/components/home/HomeCategoryGridSection";
import HomeProductDiscoverySection from "@/components/home/HomeProductDiscoverySection";
import HomeBlogTeaserSection from "@/components/home/HomeBlogTeaserSection";
import { ManufacturingHomepageSection } from "@/components/public/manufacturing/ManufacturingPublicSections";
import type { Metadata } from "next";
import Link from "next/link";
import {
  BarChart3,
  Database,
  Handshake,
  Layers3,
  PackageCheck,
  PenTool,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { buildHomepageMetadata } from "@/lib/seo/indexation-policy";

export const revalidate = 3600;

export const metadata: Metadata = buildHomepageMetadata();

const WHY_ATTD: Array<{
  title: string;
  description: string;
  Icon: LucideIcon;
}> = [
  {
    title: "Danh mục sản phẩm đầy đủ",
    description: "Hàng may mặc trơn, đồng phục, quà tặng và nhóm OEM cho nhiều kịch bản B2B.",
    Icon: Layers3,
  },
  {
    title: "Số lượng tối thiểu rõ ràng",
    description: "Tư vấn MOQ theo sản phẩm, tồn kho và nhu cầu triển khai thực tế.",
    Icon: BarChart3,
  },
  {
    title: "Hỗ trợ in/thêu/OEM",
    description: "Đi cùng đại lý, agency và doanh nghiệp từ lựa chọn mẫu đến hoàn thiện thương hiệu.",
    Icon: PenTool,
  },
  {
    title: "Hỗ trợ đại lý & agency",
    description: "Nguồn hàng, dữ liệu sản phẩm và tư vấn báo giá cho đội bán hàng chuyên nghiệp.",
    Icon: Handshake,
  },
  {
    title: "Giao hàng toàn quốc",
    description: "Phù hợp đơn hàng sự kiện, đồng phục nhân sự và chương trình quà tặng nhiều điểm giao.",
    Icon: Truck,
  },
  {
    title: "Dữ liệu sản phẩm đầy đủ",
    description: "Thông tin sản phẩm, hình ảnh, chất liệu và tùy chọn được trình bày rõ để dễ lấy nguồn.",
    Icon: Database,
  },
];

const SOURCING_STEPS = [
  {
    title: "Chọn sản phẩm hoặc gửi yêu cầu",
    description: "Duyệt danh mục có sẵn hoặc mô tả nhu cầu nguồn hàng riêng.",
  },
  {
    title: "Kiểm tra tồn kho & MOQ",
    description: "ATTD rà soát khả năng cung ứng, số lượng tối thiểu và thời gian phù hợp.",
  },
  {
    title: "Tư vấn in/thêu/OEM",
    description: "Đề xuất phương án logo, nhãn, đóng gói hoặc sản xuất riêng khi cần.",
  },
  {
    title: "Chốt báo giá",
    description: "Báo giá theo số lượng, cấu hình sản phẩm và yêu cầu hoàn thiện.",
  },
  {
    title: "Giao hàng / sản xuất",
    description: "Triển khai giao hàng hoặc sản xuất theo tiến độ đã thống nhất.",
  },
];

function PreCategoryEditorialSections({
  cms,
}: {
  cms: Awaited<ReturnType<typeof getHomepageData>>["cms"];
}) {
  const sectionOrder = getPreCategoryEditorialSections(cms);

  return (
    <>
      {sectionOrder.map((key) => {
        if (key === "proof" && cms.proofStrip.enabled) {
          return <HomeProofStrip key="proof" items={cms.proofStrip.items} />;
        }
        if (key === "pathways" && cms.sourcingPathways.enabled) {
          return (
            <HomeSourcingPathwaysSection key="pathways" pathways={cms.sourcingPathways.items} />
          );
        }
        return null;
      })}
    </>
  );
}

export default async function HomePage() {
  const { hero, cms, categories, gridChildCategories, gridChildCategoryTotal, showGridCategoryViewAllCta, latestProducts, blogPosts } = await getHomepageData();

  return (
    <main className="mp-home mp-home--v271">
      <HomeHeroSection hero={hero} categories={categories} />

      <PreCategoryEditorialSections cms={cms} />

      <ManufacturingHomepageSection
        title="Thực tế sản xuất"
        description="Hình ảnh và quy trình sản xuất thực tế tại ATTD."
        limit={6}
        className="home-manufacturing-evidence"
      />

      <HomeCategoryGridSection
        categories={gridChildCategories}
        showViewAllCta={showGridCategoryViewAllCta}
        visibleCategoryCount={gridChildCategoryTotal}
      />

      <HomeProductDiscoverySection products={latestProducts} />

      <HomeOemBannerSection banner={cms.oemBanner} />

      <MarketplaceRFQStrip />

      <section className="mp-section mp-section--tight home-b2b-benefits">
        <div className="container">
          <div className="home-b2b-benefits__layout">
            <div className="home-b2b-benefits__intro">
              <p className="home-b2b-benefits__eyebrow">Nền tảng nguồn hàng B2B</p>
              <h2 className="home-b2b-benefits__title">
                Vì sao chọn nguồn hàng B2B từ ATTD?
              </h2>
              <p className="home-b2b-benefits__description">
                ATTD giúp đại lý, agency, xưởng in và doanh nghiệp lấy nguồn hàng
                đồng phục, hàng may mặc trơn và quà tặng theo cách rõ ràng, có thể mở rộng.
              </p>
              <Link href="/lien-he" className="btn-primary home-b2b-benefits__cta">
                Tư vấn nguồn hàng
              </Link>
            </div>

            <div className="home-b2b-benefits__cards">
              {WHY_ATTD.map(({ title, description, Icon }) => (
                <article key={title} className="home-b2b-benefits__card">
                  <span className="home-b2b-benefits__icon" aria-hidden>
                    <Icon size={18} />
                  </span>
                  <h3 className="home-b2b-benefits__card-title">{title}</h3>
                  <p className="home-b2b-benefits__card-desc">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mp-section mp-section--alt mp-section--tight home-sourcing-flow">
        <div className="container">
          <MarketplaceSectionHeader
            title="Quy trình lấy nguồn hàng"
            description="Một luồng làm việc rõ ràng để đội mua hàng, đại lý và agency dễ kiểm soát yêu cầu, báo giá và tiến độ."
          />
          <ol className="home-sourcing-flow__list">
            {SOURCING_STEPS.map((step, i) => (
              <li key={step.title} className="home-sourcing-flow__item">
                <span className="home-sourcing-flow__num">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="home-sourcing-flow__icon" aria-hidden>
                  <PackageCheck size={18} />
                </span>
                <h3 className="home-sourcing-flow__title">{step.title}</h3>
                <p className="home-sourcing-flow__desc">{step.description}</p>
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
