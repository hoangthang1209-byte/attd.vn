import type { PublicQuoteDocument } from "@/features/quotes/types";
import { formatQuoteMoney, formatQuoteMoq } from "@/features/quotes/quote-format";
import { resolveAbsoluteMediaUrl } from "@/features/quotes/resolve-absolute-media-url";
import QuoteDesignThumb from "@/components/quotes/QuoteDesignThumb";

type Props = {
  quote: PublicQuoteDocument;
  /** Resolve relative image URLs for PDF/print rendering */
  absoluteMedia?: boolean;
  mediaBaseUrl?: string;
};

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
  return (
    <div className="quote-doc__table-wrap quote-doc__table-wrap--modern">
        <table className="quote-document-table quote-doc__table quote-doc__table--modern">
        <colgroup>
          {[6, 46, 12, 17, 19].map((width, index) => <col key={index} style={{ width: `${width}%` }} />)}
        </colgroup>
        <thead>
          <tr>
            <th>STT</th>
            <th>Sản phẩm / Thông số</th>
            <th>Số lượng</th>
            <th>Đơn giá</th>
            <th>Thành tiền</th>
          </tr>
        </thead>
        <tbody>
          {quote.items.map((item, i) => {
            const designUrl = absoluteMedia
              ? resolveAbsoluteMediaUrl(item.designImageUrl, mediaBaseUrl)
              : item.designImageUrl;
            const details = [
              item.description?.trim(),
              item.colorSnapshot?.trim() && `Màu: ${item.colorSnapshot.trim()}`,
              item.skuSnapshot?.trim() && `SKU: ${item.skuSnapshot.trim()}`,
              item.categorySnapshot?.trim() && `Danh mục: ${item.categorySnapshot.trim()}`,
              item.genderSnapshot?.trim() && `Giới tính: ${item.genderSnapshot.trim()}`,
              item.moqSnapshot != null && `MOQ: ${formatQuoteMoq(item.moqSnapshot)}`,
              item.itemNote?.trim(),
              item.productionLeadTime?.trim() && `Sản xuất: ${formatProductionLeadTime(item.productionLeadTime)}`,
            ].filter(Boolean);

            return (
              <tr key={i} className="quote-table-row">
                <td className="quote-doc__cell-center">{i + 1}</td>
                <td className="quote-doc__cell-product">
                  <div className="quote-doc__product-content">
                    {designUrl && <QuoteDesignThumb src={designUrl} />}
                    <div className="quote-doc__product-copy">
                      <strong>{[item.productNameSnapshot, item.variantNameSnapshot].filter(Boolean).join(" · ") || "Sản phẩm"}</strong>
                      {details.map((detail, index) => <span className="quote-doc__product-detail" key={index}>{detail}</span>)}
                    </div>
                  </div>
                </td>
                <td className="quote-doc__cell-center">{item.quantity} {item.unit}</td>
                <td className="quote-doc__cell-money">
                  {formatQuoteMoney(item.unitPrice, quote.currency)}
                </td>
                <td className="quote-doc__cell-money">
                  {formatQuoteMoney(item.lineTotal, quote.currency)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
