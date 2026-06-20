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

const PRODUCTION_COL_WIDTH = 4;

/** Base column widths (%); production column borrows proportionally from existing columns. */
function buildTableColWidths(): number[] {
  const base = [3, 6, 4, 5, 5, 12, 6, 20, 4, 5, 5, 4, 6, 7, 8];
  const scale = (100 - PRODUCTION_COL_WIDTH) / 100;
  return [...base.map((w) => Math.round(w * scale * 10) / 10), PRODUCTION_COL_WIDTH];
}

function formatProductionLeadTime(value: string | null | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) return "—";
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    return `${trimmed} ngày`;
  }
  return trimmed;
}

export default function QuoteDocumentItemsTable({
  quote,
  absoluteMedia = false,
  mediaBaseUrl,
}: Props) {
  const priceTypeLabel = quotePriceVatTypeLabel(quote.priceVatType);
  const colWidths = buildTableColWidths();

  return (
    <div className="quote-doc__table-wrap">
      <p className="quote-table-mobile-hint" aria-hidden="true">
        Vuốt ngang để xem đầy đủ bảng →
      </p>
      <div className="quote-items-scroll">
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
            <th className="quote-doc__cell-center quote-doc__th-production">
              <span className="quote-doc__th-production-line">Thời gian</span>
              <span className="quote-doc__th-production-line">sản xuất</span>
            </th>
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
                <td className="quote-doc__cell-center quote-doc__cell-production">
                  {formatProductionLeadTime(item.productionLeadTime)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </div>
  );
}
