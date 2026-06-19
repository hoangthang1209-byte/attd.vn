import { getBrandingSettings, getCompanySettings } from "@/features/settings/services/settings.service";
import PublicQuoteDocument from "@/components/quotes/PublicQuoteDocument";

type Props = { params: Promise<{ token: string }> };

export default async function PublicQuotePage({ params }: Props) {
  const { token } = await params;
  const [company, branding] = await Promise.all([
    getCompanySettings(),
    getBrandingSettings(),
  ]);

  return (
    <PublicQuoteDocument
      token={token}
      company={{
        brandName: company.name,
        hotlineDisplay: company.hotline.display,
        email: company.email,
        address: company.address,
      }}
      logoUrl={branding.headerLogoUrl ?? branding.footerLogoUrl}
    />
  );
}
