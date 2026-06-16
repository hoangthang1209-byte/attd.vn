import Header from "@/components/public/Header";
import Footer from "@/components/public/Footer";
import MobileActionBar from "@/components/public/MobileActionBar";
import FloatingContactWidget from "@/components/public/FloatingContactWidget";
import NavigationProgress from "@/components/public/NavigationProgress";
import { getBrandingSettings } from "@/features/settings/services/settings.service";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const branding = await getBrandingSettings();

  return (
    <>
      <NavigationProgress />
      <Header
        headerLogoUrl={branding.headerLogoUrl}
        companyTagline={branding.companyTagline}
      />

      <div className="public-main">{children}</div>

      <Footer />
      <MobileActionBar />
      <FloatingContactWidget />
    </>
  );
}
