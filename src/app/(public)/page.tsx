import { getHomepageData, getPreCategoryEditorialSections } from "@/features/home/homepage.service";
import HomeHeroSection from "@/components/home/HomeHeroSection";
import HomeProofStrip from "@/components/home/HomeProofStrip";
import HomeSourcingPathwaysSection from "@/components/home/HomeSourcingPathwaysSection";
import HomeOemBannerSection from "@/components/home/HomeOemBannerSection";
import HomeB2bBenefitsSection from "@/components/home/HomeB2bBenefitsSection";
import HomeSourcingFlowSection from "@/components/home/HomeSourcingFlowSection";
import HomeTrustBandSection from "@/components/home/HomeTrustBandSection";
import MarketplaceRFQStrip from "@/components/marketplace/MarketplaceRFQStrip";
import MarketplaceFinalCta from "@/components/marketplace/MarketplaceFinalCta";
import HomeCategoryGridSection from "@/components/home/HomeCategoryGridSection";
import HomeProductDiscoverySection from "@/components/home/HomeProductDiscoverySection";
import HomeBlogTeaserSection from "@/components/home/HomeBlogTeaserSection";
import HomeWorkshopGallerySection from "@/components/home/HomeWorkshopGallerySection";
import CompanyFacts from "@/components/public/company/CompanyFacts";
import CaseStudySection from "@/components/public/CaseStudySection";
import type { Metadata } from "next";
import { buildHomepageMetadata } from "@/lib/seo/indexation-policy";

export const revalidate = 3600;

export const metadata: Metadata = buildHomepageMetadata();

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
    <main className="mp-home mp-home--v273">
      <HomeHeroSection
        hero={hero}
        categories={categories}
        proofItems={cms.proofStrip.items}
      />

      <PreCategoryEditorialSections cms={cms} />

      <HomeCategoryGridSection
        categories={gridChildCategories}
        showViewAllCta={showGridCategoryViewAllCta}
        visibleCategoryCount={gridChildCategoryTotal}
      />

      <HomeProductDiscoverySection products={latestProducts} />

      <HomeTrustBandSection />

      <HomeOemBannerSection banner={cms.oemBanner} />

      <MarketplaceRFQStrip />

      <HomeB2bBenefitsSection />

      <HomeSourcingFlowSection />

      <CaseStudySection />

      <CompanyFacts className="home-company-facts" cms={cms.companyReality} />

      <HomeWorkshopGallerySection gallery={cms.workshopGallery} />

      <HomeBlogTeaserSection posts={blogPosts} />

      <MarketplaceFinalCta
        trustItems={["Tư vấn MOQ rõ ràng", "Hỗ trợ in/thêu/OEM", "Giao hàng toàn quốc"]}
      />
    </main>
  );
}
