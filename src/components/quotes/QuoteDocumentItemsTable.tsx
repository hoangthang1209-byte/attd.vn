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

export default function QuoteDocumentItemsTable({
  quote,
  absoluteMedia = false,
  mediaBaseUrl,
}: Props) {
  const priceTypeLabel = quotePriceVatTypeLabel(quote.priceVatType);

  return (
    <div className="quote-doc__table-wrap">
      <table className="quote-document-table quote-doc__table">
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
                <td>{i + 1}</td>
                <td className="quote-doc__cell-design">
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
                <td>{item.colorSnapshot || "—"}</td>
                <td>{item.categorySnapshot || "—"}</td>
                <td>{item.genderSnapshot || "—"}</td>
                <td>
                  {[item.productNameSnapshot, item.variantNameSnapshot]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </td>
                <td>{item.skuSnapshot || "—"}</td>
                <td>{item.description || "—"}</td>
                <td>{formatQuoteMoq(item.moqSnapshot)}</td>
                <td>{item.itemNote || "—"}</td>
                <td>{item.quantity}</td>
                <td>{item.unit}</td>
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
