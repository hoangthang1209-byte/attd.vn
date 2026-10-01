import "@/styles/public-v7.css";
import PublicHeaderV7 from "@/components/public/v7/PublicHeaderV7";
import PublicFooterV7 from "@/components/public/v7/PublicFooterV7";
import MobileActionBar from "@/components/public/MobileActionBar";
import FloatingContactWidget from "@/components/public/FloatingContactWidget";
import NavigationProgress from "@/components/public/NavigationProgress";
import OrganizationSchema from "@/components/seo/OrganizationSchema";
import { getBrandingSettings } from "@/features/settings/services/settings.service";
import { getPublicSiteNavigation } from "@/features/site-navigation/site-navigation.service";
import { getMarketplaceCategoryTree } from "@/features/categories/marketplace-category-tree";

export const revalidate = 3600;

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [branding, siteNavigation, categoryTree] = await Promise.all([
    getBrandingSettings(),
    getPublicSiteNavigation(),
    getMarketplaceCategoryTree(),
  ]);

  return (
    <>
      <OrganizationSchema />
      <NavigationProgress />
      <PublicHeaderV7 logoUrl={branding.headerLogoUrl} categoryTree={categoryTree} />

      <div className="public-main public-main--v7">{children}</div>

      <PublicFooterV7 siteNavigation={siteNavigation} />
      <MobileActionBar siteNavigation={siteNavigation} />
      <FloatingContactWidget />
    </>
  );
}
