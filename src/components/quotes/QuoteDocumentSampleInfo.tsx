import type { PublicQuoteDocument } from "@/features/quotes/types";
import { formatQuoteMoney } from "@/features/quotes/quote-format";

type Props = {
  quote: Pick<
    PublicQuoteDocument,
    "sampleFee" | "sampleLeadTime" | "sampleRefundCondition" | "currency"
  >;
};

export default function QuoteDocumentSampleInfo({ quote }: Props) {
  const rows = [
    {
      label: "Phí mẫu",
      value:
        quote.sampleFee != null && quote.sampleFee > 0
          ? formatQuoteMoney(quote.sampleFee, quote.currency)
          : null,
    },
    {
      label: "Thời gian làm mẫu",
      value: quote.sampleLeadTime?.trim() || null,
    },
    {
      label: "Điều kiện hoàn phí",
      value: quote.sampleRefundCondition?.trim() || null,
      multiline: Boolean(quote.sampleRefundCondition?.trim()),
    },
  ];
  const visibleRows = rows.filter((row) => row.value);
  if (visibleRows.length === 0) return null;

  return (
    <section className="quote-doc__sample-info">
      <h3 className="quote-doc__sample-info-title">THÔNG TIN MẪU</h3>
      <table className="quote-doc__sample-table">
        <tbody>
          {visibleRows.map((row) => (
            <tr key={row.label}>
              <th scope="row">{row.label}</th>
              <td className={row.multiline ? "quote-doc__sample-value--multiline" : undefined}>
                {row.multiline ? (
                  <pre className="quote-doc__sample-pre">{row.value}</pre>
                ) : (
                  row.value
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
