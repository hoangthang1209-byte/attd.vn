import type { PublicQuoteDocument } from "@/features/quotes/types";

type Props = {
  quote: Pick<PublicQuoteDocument, "customerNote" | "terms" | "preparedBy">;
};

export default function QuoteDocumentNotes({ quote }: Props) {
  return (
    <>
      {quote.customerNote && (
        <section className="quote-document-notes quote-doc__notes">
          <h3>Ghi chú gửi khách</h3>
          <p>{quote.customerNote}</p>
        </section>
      )}

      {quote.terms && (
        <section className="quote-document-terms quote-doc__terms">
          <h3>Điều khoản báo giá</h3>
          <pre>{quote.terms}</pre>
        </section>
      )}

      {quote.preparedBy && (
        <p className="quote-doc__prepared">Người lập: {quote.preparedBy}</p>
      )}
    </>
  );
}
