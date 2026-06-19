import PublicQuoteDocument from "@/components/quotes/PublicQuoteDocument";
import { getBrandingSettings, getCompanySettings } from "@/features/settings/services/settings.service";
import { resolveQuoteCompanyProfile } from "@/features/quotes/quote-company-profile";

type Props = { params: Promise<{ token: string }> };

export default async function PublicQuotePage({ params }: Props) {
  const { token } = await params;
  const [companySettings, branding] = await Promise.all([
    getCompanySettings(),
    getBrandingSettings(),
  ]);
  const company = resolveQuoteCompanyProfile(companySettings);

  return (
    <PublicQuoteDocument
      token={token}
      company={company}
      logoUrl={branding.headerLogoUrl ?? branding.footerLogoUrl}
    />
  );
}
