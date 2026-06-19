import { notFound } from "next/navigation";
import QuoteDocumentContent from "@/components/quotes/QuoteDocumentContent";
import QuoteDocumentAutoprint from "@/components/quotes/QuoteDocumentAutoprint";
import { getPublicQuoteByToken } from "@/features/quotes/quote.service";
import { getBrandingSettings, getCompanySettings } from "@/features/settings/services/settings.service";
import { resolveQuoteCompanyProfile } from "@/features/quotes/quote-company-profile";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ mode?: string; autoprint?: string }>;
};

function resolveDocumentVariant(mode?: string): "screen" | "pdf" | "print" {
  if (mode === "pdf") return "pdf";
  if (mode === "print") return "print";
  return "screen";
}

/**
 * Document-only quote page — no site nav, footer, or action buttons.
 * Used for browser print (?mode=print&autoprint=1) and Chromium PDF (?mode=pdf).
 */
export default async function QuoteDocumentPage({ params, searchParams }: Props) {
  const { token } = await params;
  const { mode, autoprint } = await searchParams;

  const [quote, companySettings, branding] = await Promise.all([
    getPublicQuoteByToken(token),
    getCompanySettings(),
    getBrandingSettings(),
  ]);

  if (!quote) notFound();

  const company = resolveQuoteCompanyProfile(companySettings);
  const logoUrl = branding.headerLogoUrl ?? branding.footerLogoUrl;
  const variant = resolveDocumentVariant(mode);
  const shouldAutoprint = autoprint === "1" && variant === "print";

  return (
    <>
      <QuoteDocumentContent
        quote={quote}
        company={company}
        logoUrl={logoUrl}
        variant={variant}
      />
      {shouldAutoprint && <QuoteDocumentAutoprint />}
    </>
  );
}
