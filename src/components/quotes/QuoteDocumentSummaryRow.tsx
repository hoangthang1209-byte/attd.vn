import type { PublicQuoteDocument } from "@/features/quotes/types";
import QuoteDocumentSampleInfo from "@/components/quotes/QuoteDocumentSampleInfo";
import QuoteDocumentTotals from "@/components/quotes/QuoteDocumentTotals";

type Props = {
  quote: PublicQuoteDocument;
};

export default function QuoteDocumentSummaryRow({ quote }: Props) {
  return (
    <div className="quote-doc__summary-row">
      <QuoteDocumentSampleInfo quote={quote} />
      <QuoteDocumentTotals quote={quote} />
    </div>
  );
}
