import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import PublicQuoteDocument from "@/components/quotes/PublicQuoteDocument";
import { getBrandingSettings, getCompanySettings } from "@/features/settings/services/settings.service";
import { resolveQuoteCompanyProfile } from "@/features/quotes/quote-company-profile";
import {
  findQuotePublicTokenByPublicLink,
  getQuotePublicPath,
  parseQuotePublicLinkSegment,
} from "@/features/quotes/quote-public-link.service";

type Props = { params: Promise<{ quoteLink: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { quoteLink } = await params;
  const parsed = parseQuotePublicLinkSegment(quoteLink);
  const title = parsed ? `Báo giá ${parsed.quoteNo}` : "Báo giá";
  return {
    title,
    robots: { index: false, follow: false },
  };
}

export default async function PublicQuoteShortLinkPage({ params }: Props) {
  const { quoteLink } = await params;
  const parsed = parseQuotePublicLinkSegment(quoteLink);
  if (!parsed) notFound();

  const canonicalPath = getQuotePublicPath(parsed);
  if (!canonicalPath) notFound();

  if (quoteLink !== canonicalPath.slice(1)) {
    permanentRedirect(canonicalPath);
  }

  const publicToken = await findQuotePublicTokenByPublicLink(parsed);
  if (!publicToken) notFound();

  const [companySettings, branding] = await Promise.all([
    getCompanySettings(),
    getBrandingSettings(),
  ]);
  const company = resolveQuoteCompanyProfile(companySettings);

  return (
    <PublicQuoteDocument
      token={publicToken}
      company={company}
      logoUrl={branding.headerLogoUrl ?? branding.footerLogoUrl}
      loadingLogoUrl={branding.headerLogoUrl ?? branding.footerLogoUrl}
    />
  );
}
