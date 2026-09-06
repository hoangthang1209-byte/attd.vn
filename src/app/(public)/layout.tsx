import Header from "@/components/public/Header";
import Footer from "@/components/public/Footer";
import MobileActionBar from "@/components/public/MobileActionBar";
import FloatingContactWidget from "@/components/public/FloatingContactWidget";
import NavigationProgress from "@/components/public/NavigationProgress";
import OrganizationSchema from "@/components/seo/OrganizationSchema";
import { getBrandingSettings } from "@/features/settings/services/settings.service";
import { getMarketplaceCategoryTree } from "@/features/categories/marketplace-category-tree";
import { getPublicSiteNavigation } from "@/features/site-navigation/site-navigation.service";

/**
 * Public shell is visitor-shared (branding / nav / categories). Freshness comes from
 * tagged data caches + mutation-time revalidation — not force-dynamic.
 */
export const revalidate = 3600;

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [branding, categoryTree, siteNavigation] = await Promise.all([
    getBrandingSettings(),
    getMarketplaceCategoryTree(),
    getPublicSiteNavigation(),
  ]);

  return (
    <>
      <OrganizationSchema />
      <NavigationProgress />
      <Header
        headerLogoUrl={branding.headerLogoUrl}
        companyTagline={branding.companyTagline}
        categoryTree={categoryTree}
        siteNavigation={siteNavigation}
      />

      <div className="public-main">{children}</div>

      <Footer siteNavigation={siteNavigation} />
      <MobileActionBar siteNavigation={siteNavigation} />
      <FloatingContactWidget />
    </>
  );
}
