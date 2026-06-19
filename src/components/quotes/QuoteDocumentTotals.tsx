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
    <div className="quote-document-totals quote-doc__totals">
      <p>Tạm tính: {formatQuoteMoney(quote.subtotal, quote.currency)}</p>
      {quote.discountAmount > 0 && (
        <p>Chiết khấu: {formatQuoteMoney(quote.discountAmount, quote.currency)}</p>
      )}
      {quote.shippingFee > 0 && (
        <p>Phí vận chuyển: {formatQuoteMoney(quote.shippingFee, quote.currency)}</p>
      )}
      {quote.vatAmount > 0 && (
        <p>
          VAT ({quote.vatRate}%): {formatQuoteMoney(quote.vatAmount, quote.currency)}
        </p>
      )}
      <p className="quote-doc__grand-total">
        <strong>Tổng cộng: {formatQuoteMoney(displayTotal, quote.currency)}</strong>
      </p>
    </div>
  );
}
