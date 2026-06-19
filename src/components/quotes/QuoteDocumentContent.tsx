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
import QuoteDocumentTotals from "@/components/quotes/QuoteDocumentTotals";
import QuoteDocumentNotes from "@/components/quotes/QuoteDocumentNotes";

type Props = {
  quote: PublicQuoteDocument;
  company: QuoteCompanyProfile;
  logoUrl?: string | null;
  variant?: "screen" | "pdf" | "print";
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
}: Props) {
  const absoluteMedia = variant === "pdf" || variant === "print";
  const resolvedLogo = absoluteMedia ? resolveAbsoluteMediaUrl(logoUrl) : logoUrl;

  return (
    <QuoteDocumentShell variant={variant}>
      <QuoteCompanyHeader company={company} logoUrl={resolvedLogo} />
      <QuoteDocMeta quote={quote} />
      <QuotePartyColumns quote={quote} />
      <QuoteDocumentItemsTable quote={quote} absoluteMedia={absoluteMedia} />
      <QuoteDocumentTotals quote={quote} />
      <QuoteDocumentNotes quote={quote} />
    </QuoteDocumentShell>
  );
}
