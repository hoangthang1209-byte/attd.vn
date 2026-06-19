import Header from "@/components/public/Header";
import Footer from "@/components/public/Footer";
import MobileActionBar from "@/components/public/MobileActionBar";
import FloatingContactWidget from "@/components/public/FloatingContactWidget";
import NavigationProgress from "@/components/public/NavigationProgress";
import { getBrandingSettings } from "@/features/settings/services/settings.service";
import { getMarketplaceCategoryTree } from "@/features/categories/marketplace-category-tree";

/** Category tree in header must stay fresh — matches `/san-pham` CMS hierarchy. */
export const dynamic = "force-dynamic";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [branding, categoryTree] = await Promise.all([
    getBrandingSettings(),
    getMarketplaceCategoryTree(),
  ]);

  return (
    <>
      <NavigationProgress />
      <Header
        headerLogoUrl={branding.headerLogoUrl}
        companyTagline={branding.companyTagline}
        categoryTree={categoryTree}
      />

      <div className="public-main">{children}</div>

      <Footer />
      <MobileActionBar />
      <FloatingContactWidget />
    </>
  );
}
