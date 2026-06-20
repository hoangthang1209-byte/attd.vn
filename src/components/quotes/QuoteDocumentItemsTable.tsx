import type { PublicQuoteDocument } from "@/features/quotes/types";
import { formatQuoteMoney, formatQuoteMoq } from "@/features/quotes/quote-format";
import { quotePriceVatTypeLabel } from "@/features/quotes/labels";
import { resolveAbsoluteMediaUrl } from "@/features/quotes/resolve-absolute-media-url";
import QuoteDesignThumb from "@/components/quotes/QuoteDesignThumb";

type Props = {
  quote: PublicQuoteDocument;
  /** Resolve relative image URLs for PDF/print rendering */
  absoluteMedia?: boolean;
  mediaBaseUrl?: string;
};

const OPTIONAL_COL_WIDTH = 4;

/** Base column widths (%); optional columns borrow from Mô tả. */
function buildTableColWidths(quote: PublicQuoteDocument): number[] {
  let descWidth = 20;
  const widths = [3, 6, 4, 5, 5, 12, 6, descWidth, 4, 5, 5, 4, 6, 7, 8];

  if (quote.showProductionLeadTime) {
    descWidth -= OPTIONAL_COL_WIDTH;
    widths.push(OPTIONAL_COL_WIDTH);
  }
  if (quote.showSampleFee) {
    descWidth -= OPTIONAL_COL_WIDTH;
    widths.push(OPTIONAL_COL_WIDTH);
  }
  if (quote.showSampleLeadTime) {
    descWidth -= OPTIONAL_COL_WIDTH;
    widths.push(OPTIONAL_COL_WIDTH);
  }

  widths[7] = Math.max(descWidth, 12);
  return widths;
}

export default function QuoteDocumentItemsTable({
  quote,
  absoluteMedia = false,
  mediaBaseUrl,
}: Props) {
  const priceTypeLabel = quotePriceVatTypeLabel(quote.priceVatType);
  const colWidths = buildTableColWidths(quote);

  return (
    <div className="quote-doc__table-wrap">
      <table className="quote-document-table quote-doc__table">
        <colgroup>
          {colWidths.map((width, index) => (
            <col key={index} style={{ width: `${width}%` }} />
          ))}
        </colgroup>
        <thead>
          <tr>
            <th>STT</th>
            <th>Thiết kế</th>
            <th>Màu</th>
            <th>Danh mục</th>
            <th>Giới tính</th>
            <th>Sản phẩm</th>
            <th>SKU</th>
            <th>Mô tả</th>
            <th>MOQ</th>
            <th>Ghi chú</th>
            <th>Số lượng</th>
            <th>Đơn vị</th>
            <th>Loại giá</th>
            <th>Đơn giá</th>
            <th>Tổng</th>
            {quote.showProductionLeadTime && <th>Thời gian sản xuất</th>}
            {quote.showSampleFee && <th>Phí làm mẫu</th>}
            {quote.showSampleLeadTime && <th>Thời gian làm mẫu</th>}
          </tr>
        </thead>
        <tbody>
          {quote.items.map((item, i) => {
            const designUrl = absoluteMedia
              ? resolveAbsoluteMediaUrl(item.designImageUrl, mediaBaseUrl)
              : item.designImageUrl;

            return (
              <tr key={i} className={`quote-table-row${i % 2 === 1 ? " quote-doc__row--alt" : ""}`}>
                <td className="quote-doc__cell-center">{i + 1}</td>
                <td className="quote-doc__cell-design quote-doc__cell-center">
                  {designUrl ? (
                    <>
                      <QuoteDesignThumb src={designUrl} />
                      <span className="quote-doc__muted" hidden>
                        Chưa có
                      </span>
                    </>
                  ) : (
                    <span className="quote-doc__muted">Chưa có</span>
                  )}
                </td>
                <td className="quote-doc__cell-center">{item.colorSnapshot || "—"}</td>
                <td className="quote-doc__cell-center">{item.categorySnapshot || "—"}</td>
                <td className="quote-doc__cell-center">{item.genderSnapshot || "—"}</td>
                <td className="quote-doc__cell-product">
                  {[item.productNameSnapshot, item.variantNameSnapshot]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </td>
                <td className="quote-doc__cell-sku">{item.skuSnapshot || "—"}</td>
                <td className="quote-doc__cell-desc">{item.description || "—"}</td>
                <td className="quote-doc__cell-center">{formatQuoteMoq(item.moqSnapshot)}</td>
                <td>{item.itemNote || "—"}</td>
                <td className="quote-doc__cell-center">{item.quantity}</td>
                <td className="quote-doc__cell-center">{item.unit}</td>
                <td>{priceTypeLabel}</td>
                <td className="quote-doc__cell-money">
                  {formatQuoteMoney(item.unitPrice, quote.currency)}
                </td>
                <td className="quote-doc__cell-money">
                  {formatQuoteMoney(item.lineTotal, quote.currency)}
                </td>
                {quote.showProductionLeadTime && (
                  <td>{item.productionLeadTime || "—"}</td>
                )}
                {quote.showSampleFee && (
                  <td>
                    {item.sampleFee != null
                      ? formatQuoteMoney(item.sampleFee, quote.currency)
                      : "—"}
                  </td>
                )}
                {quote.showSampleLeadTime && (
                  <td>{item.sampleLeadTime || "—"}</td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
