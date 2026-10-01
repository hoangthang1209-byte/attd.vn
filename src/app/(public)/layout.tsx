import "@/styles/public-v7.css";
import PublicHeaderV7 from "@/components/public/v7/PublicHeaderV7";
import PublicFooterV7 from "@/components/public/v7/PublicFooterV7";
import MobileActionBar from "@/components/public/MobileActionBar";
import FloatingContactWidget from "@/components/public/FloatingContactWidget";
import NavigationProgress from "@/components/public/NavigationProgress";
import OrganizationSchema from "@/components/seo/OrganizationSchema";
import { getBrandingSettings } from "@/features/settings/services/settings.service";
import { getPublicSiteNavigation } from "@/features/site-navigation/site-navigation.service";

export const revalidate = 3600;

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [branding, siteNavigation] = await Promise.all([
    getBrandingSettings(),
    getPublicSiteNavigation(),
  ]);

  return (
    <>
      <OrganizationSchema />
      <NavigationProgress />
      <PublicHeaderV7 logoUrl={branding.headerLogoUrl} />

      <div className="public-main public-main--v7">{children}</div>

      <PublicFooterV7 />
      <MobileActionBar siteNavigation={siteNavigation} />
      <FloatingContactWidget />
    </>
  );
}
