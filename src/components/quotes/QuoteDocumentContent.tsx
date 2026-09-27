import type { PublicQuoteDocument } from "@/features/quotes/types";
import type { QuoteCompanyProfile } from "@/features/quotes/quote-company-profile";
import { resolveAbsoluteMediaUrl } from "@/features/quotes/resolve-absolute-media-url";
import QuoteDocumentShell from "@/components/quotes/QuoteDocumentShell";
import {
  QuoteCompanyHeader,
  QuoteDocMeta,
  QuotePartyColumns,
} from "@/components/quotes/QuoteDocumentSections";
import QuoteDocumentItemsTable from "@/components/quotes/QuoteDocumentItemsTable";
import QuoteDocumentSummaryRow from "@/components/quotes/QuoteDocumentSummaryRow";
import QuoteDocumentNotes from "@/components/quotes/QuoteDocumentNotes";
import "@fontsource/be-vietnam-pro/400.css";
import "@fontsource/be-vietnam-pro/500.css";
import "@fontsource/be-vietnam-pro/600.css";
import "@fontsource/be-vietnam-pro/700.css";
import "@/styles/quote-document-compact.css";

type Props = {
  quote: PublicQuoteDocument;
  company: QuoteCompanyProfile;
  logoUrl?: string | null;
  variant?: "screen" | "pdf" | "print";
  /** Absolute base URL for media in PDF/print mode */
  mediaBaseUrl?: string;
};

/**
 * Single source of truth for quote document layout.
 * Used by public quote page, document-only print/PDF route, and previews.
 */
export default function QuoteDocumentContent({
  quote,
  company,
  logoUrl,
  variant = "screen",
  mediaBaseUrl,
}: Props) {
  const absoluteMedia = variant === "pdf" || variant === "print";
  const resolvedLogo = absoluteMedia
    ? resolveAbsoluteMediaUrl(logoUrl, mediaBaseUrl)
    : logoUrl;

  return (
    <QuoteDocumentShell variant={variant}>
      <QuoteCompanyHeader company={company} logoUrl={resolvedLogo} quoteNo={quote.quoteNo} />
      <QuoteDocMeta quote={quote} />
      <QuotePartyColumns quote={quote} />
      <QuoteDocumentItemsTable
        quote={quote}
        absoluteMedia={absoluteMedia}
        mediaBaseUrl={mediaBaseUrl}
      />
      <QuoteDocumentSummaryRow quote={quote} />
      <QuoteDocumentNotes quote={quote} />
    </QuoteDocumentShell>
  );
}
