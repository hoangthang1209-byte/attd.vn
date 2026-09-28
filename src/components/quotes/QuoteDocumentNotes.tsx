import type { PublicQuoteDocument } from "@/features/quotes/types";
import { DEFAULT_QUOTE_TERMS } from "@/features/quotes/quote-code";
import { resolveQuoteIssuerName } from "@/features/quotes/quote-issuer";

type Props = {
  quote: Pick<PublicQuoteDocument, "customerNote" | "terms" | "preparedBy" | "salesName">;
};

export default function QuoteDocumentNotes({ quote }: Props) {
  const termsText = quote.terms?.trim() || DEFAULT_QUOTE_TERMS;
  const issuerName = resolveQuoteIssuerName(quote.preparedBy, quote.salesName);

  return (
    <>
      {quote.customerNote && (
        <section className="quote-document-notes quote-doc__notes">
          <h3>GHI CHÚ GỬI KHÁCH</h3>
          <p>{quote.customerNote}</p>
        </section>
      )}

      <section className="quote-document-terms quote-doc__terms">
        <h3>ĐIỀU KHOẢN BÁO GIÁ</h3>
        <pre>{termsText}</pre>
      </section>

      {issuerName && (
        <section className="quote-doc__issuer" aria-label="Người báo giá">
          <div className="quote-doc__issuer-content">
            <h3>NGƯỜI BÁO GIÁ</h3>
            <p>{issuerName}</p>
          </div>
        </section>
      )}
    </>
  );
}
