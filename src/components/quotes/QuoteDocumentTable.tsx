"use client";

import type { PublicQuoteDocument as PublicQuoteData } from "@/features/quotes/types";
import type { QuoteCompanyProfile } from "@/features/quotes/quote-company-profile";
import { formatQuoteMoney, formatQuoteMoq, getQuoteDesignImageUrl } from "@/features/quotes/quote-format";
import { quotePriceVatTypeLabel } from "@/features/quotes/labels";
import {
  QuoteCompanyHeader,
  QuoteDocMeta,
  QuotePartyColumns,
} from "@/components/quotes/QuoteDocumentSections";

type Props = {
  quote: PublicQuoteData;
  company: QuoteCompanyProfile;
  logoUrl?: string | null;
  showActions?: boolean;
  onPrint?: () => void;
  onDownloadPdf?: () => void;
  pdfDownloading?: boolean;
};

export default function QuoteDocumentTable({
  quote,
  company,
  logoUrl,
  showActions = false,
  onPrint,
  onDownloadPdf,
  pdfDownloading = false,
}: Props) {
  const displayTotal =
    quote.manualOverride && quote.manualTotalAmount != null
      ? quote.manualTotalAmount
      : quote.totalAmount;

  const priceTypeLabel = quotePriceVatTypeLabel(quote.priceVatType);

  return (
    <div className="quote-doc">
      <div className="quote-doc__paper" id="quote-print-area">
        <QuoteCompanyHeader company={company} logoUrl={logoUrl} />
        <QuoteDocMeta quote={quote} />
        <QuotePartyColumns quote={quote} />

        <div className="quote-doc__table-wrap">
          <table className="quote-doc__table">
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
                <th>SL</th>
                <th>ĐV</th>
                <th>Loại giá</th>
                <th>Đơn giá</th>
                <th>Tổng</th>
                {quote.showProductionLeadTime && <th>TG sản xuất</th>}
                {quote.showSampleFee && <th>Phí mẫu</th>}
                {quote.showSampleLeadTime && <th>TG mẫu</th>}
              </tr>
            </thead>
            <tbody>
              {quote.items.map((item, i) => {
                const designUrl = getQuoteDesignImageUrl(item);
                return (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>
                      {designUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={designUrl} alt="" className="quote-doc__design-thumb" />
                      ) : (
                        <span className="quote-doc__muted">—</span>
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
                    <td>{formatQuoteMoney(item.unitPrice, quote.currency)}</td>
                    <td>{formatQuoteMoney(item.lineTotal, quote.currency)}</td>
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

        <div className="quote-doc__totals">
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

        {quote.customerNote && (
          <section className="quote-doc__notes">
            <h3>Ghi chú gửi khách</h3>
            <p>{quote.customerNote}</p>
          </section>
        )}

        {quote.terms && (
          <section className="quote-doc__terms">
            <h3>Điều khoản báo giá</h3>
            <pre>{quote.terms}</pre>
          </section>
        )}

        {quote.preparedBy && (
          <p className="quote-doc__prepared">Người lập: {quote.preparedBy}</p>
        )}
      </div>

      {showActions && (
        <div className="quote-doc__actions no-print">
          {onPrint && (
            <button type="button" className="admin-btn admin-btn--secondary" onClick={onPrint}>
              In / Lưu PDF
            </button>
          )}
          {onDownloadPdf && (
            <button
              type="button"
              className="admin-btn admin-btn--primary"
              onClick={onDownloadPdf}
              disabled={pdfDownloading}
            >
              {pdfDownloading ? "Đang tạo PDF..." : "Tải PDF báo giá"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
