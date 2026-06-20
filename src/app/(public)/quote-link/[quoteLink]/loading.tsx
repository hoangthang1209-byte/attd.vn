import QuotePublicLoading from "@/components/quotes/QuotePublicLoading";
import { getBrandingSettings } from "@/features/settings/services/settings.service";

export default async function PublicQuoteShortLinkLoading() {
  const branding = await getBrandingSettings();
  return (
    <QuotePublicLoading logoUrl={branding.headerLogoUrl ?? branding.footerLogoUrl} />
  );
}
