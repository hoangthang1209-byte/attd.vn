import type { PublicQuoteDocument } from "@/features/quotes/types";
import { formatQuoteMoney } from "@/features/quotes/quote-format";

type Props = {
  quote: Pick<
    PublicQuoteDocument,
    | "subtotal"
    | "discountAmount"
    | "shippingFee"
    | "vatRate"
    | "vatAmount"
    | "totalAmount"
    | "manualOverride"
    | "manualTotalAmount"
    | "currency"
  >;
};

export default function QuoteDocumentTotals({ quote }: Props) {
  const displayTotal =
    quote.manualOverride && quote.manualTotalAmount != null
      ? quote.manualTotalAmount
      : quote.totalAmount;

  return (
    <dl className="quote-document-totals quote-doc__totals">
      <div><dt>Tạm tính</dt><dd>{formatQuoteMoney(quote.subtotal, quote.currency)}</dd></div>
      {quote.discountAmount > 0 && (
        <div><dt>Chiết khấu</dt><dd>−{formatQuoteMoney(quote.discountAmount, quote.currency)}</dd></div>
      )}
      {quote.shippingFee > 0 && (
        <div><dt>Phí vận chuyển</dt><dd>{formatQuoteMoney(quote.shippingFee, quote.currency)}</dd></div>
      )}
      {quote.vatAmount > 0 && (
        <div><dt>VAT ({quote.vatRate}%)</dt><dd>{formatQuoteMoney(quote.vatAmount, quote.currency)}</dd></div>
      )}
      <div className="quote-doc__grand-total">
        <dt>Tổng thanh toán</dt><dd>{formatQuoteMoney(displayTotal, quote.currency)}</dd>
      </div>
    </dl>
  );
}
