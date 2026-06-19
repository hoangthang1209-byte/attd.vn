import { notFound } from "next/navigation";
import QuoteDocumentContent from "@/components/quotes/QuoteDocumentContent";
import { getPublicQuoteByToken } from "@/features/quotes/quote.service";
import { getBrandingSettings, getCompanySettings } from "@/features/settings/services/settings.service";
import { resolveQuoteCompanyProfile } from "@/features/quotes/quote-company-profile";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }> };

/** Document-only quote page for HTML-to-PDF rendering — no site nav or actions. */
export default async function QuoteDocumentPdfPage({ params }: Props) {
  const { token } = await params;
  const [quote, companySettings, branding] = await Promise.all([
    getPublicQuoteByToken(token),
    getCompanySettings(),
    getBrandingSettings(),
  ]);

  if (!quote) notFound();

  const company = resolveQuoteCompanyProfile(companySettings);
  const logoUrl = branding.headerLogoUrl ?? branding.footerLogoUrl;

  return (
    <QuoteDocumentContent
      quote={quote}
      company={company}
      logoUrl={logoUrl}
      pdfMode
    />
  );
}
