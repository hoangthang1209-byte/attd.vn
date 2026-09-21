import { getHomepageData } from "@/features/home/homepage.service";
import HomeHeroSection from "@/components/home/HomeHeroSection";
import HomeEarlyTrustBand from "@/components/home/HomeEarlyTrustBand";
import HomeSourcingPathwaysSection from "@/components/home/HomeSourcingPathwaysSection";
import HomeOemBannerSection from "@/components/home/HomeOemBannerSection";
import MarketplaceRFQStrip from "@/components/marketplace/MarketplaceRFQStrip";
import MarketplaceFinalCta from "@/components/marketplace/MarketplaceFinalCta";
import HomeCategoryGridSection from "@/components/home/HomeCategoryGridSection";
import HomeProductDiscoverySection from "@/components/home/HomeProductDiscoverySection";
import HomeBlogTeaserSection from "@/components/home/HomeBlogTeaserSection";
import HomeOperationalProofSection from "@/components/home/HomeOperationalProofSection";
import HomeSourcingProcessSection from "@/components/home/HomeSourcingProcessSection";
import HomeOperationalCapabilitySection from "@/components/home/HomeOperationalCapabilitySection";
import CaseStudySection from "@/components/public/CaseStudySection";
import type { Metadata } from "next";
import { buildHomepageMetadata } from "@/lib/seo/indexation-policy";
import { VERIFIED_EXPERIENCE_YEARS } from "@/lib/company-trust";

export const revalidate = 3600;

export const metadata: Metadata = buildHomepageMetadata();

function buildHeroTrustLine(): string {
  return `${VERIFIED_EXPERIENCE_YEARS}+ năm kinh nghiệm · OEM / Private Label · Showroom & kho tại TP.HCM`;
}

export default async function HomePage() {
  const {
    hero,
    cms,
    categories,
    gridChildCategories,
    gridChildCategoryTotal,
    showGridCategoryViewAllCta,
    latestProducts,
    blogPosts,
  } = await getHomepageData();

  return (
    <main className="mp-home mp-home--v272">
      <HomeHeroSection hero={hero} categories={categories} trustLine={buildHeroTrustLine()} />

      <HomeEarlyTrustBand enabled={cms.proofStrip.enabled} proofItems={cms.proofStrip.items} />

      {cms.sourcingPathways.enabled ? (
        <HomeSourcingPathwaysSection pathways={cms.sourcingPathways.items} />
      ) : null}

      <HomeCategoryGridSection
        categories={gridChildCategories}
        showViewAllCta={showGridCategoryViewAllCta}
        visibleCategoryCount={gridChildCategoryTotal}
      />

      <HomeProductDiscoverySection products={latestProducts} />

      <HomeOemBannerSection banner={cms.oemBanner} />

      <CaseStudySection />

      <HomeOperationalProofSection />

      <HomeSourcingProcessSection />

      <HomeOperationalCapabilitySection cms={cms} />

      <MarketplaceRFQStrip />

      <HomeBlogTeaserSection posts={blogPosts} />

      <MarketplaceFinalCta
        title="Sẵn sàng trao đổi nguồn hàng cho dự án tiếp theo?"
        description="Gửi yêu cầu để ATTD tư vấn cấu hình sản phẩm, MOQ, lead time và phương án triển khai phù hợp."
      />
    </main>
  );
}
