"use client";

import type { PublicQuoteDocument as PublicQuoteData } from "@/features/quotes/types";
import { formatQuoteDate } from "@/features/quotes/format";
import { formatQuoteMoney, formatQuoteMoq, getQuoteDesignImageUrl } from "@/features/quotes/quote-format";
import { quotePriceVatTypeLabel } from "@/features/quotes/labels";

type Props = {
  quote: PublicQuoteData;
  company?: { brandName: string; hotlineDisplay: string; email: string; address: string };
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
        <header className="quote-doc__header">
          {logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={company?.brandName ?? "ATTD"} className="quote-doc__logo" />
          )}
          <div className="quote-doc__header-text">
            <h1>BẢNG BÁO GIÁ</h1>
            {company && (
              <>
                <p className="quote-doc__brand">{company.brandName}</p>
                <p>{company.address}</p>
                <p>{company.hotlineDisplay} · {company.email}</p>
              </>
            )}
          </div>
        </header>

        <div className="quote-doc__meta-grid">
          <section>
            <h3>Thông tin khách hàng</h3>
            {quote.customerCompany && <p><strong>Đơn vị:</strong> {quote.customerCompany}</p>}
            {quote.customerTaxCode && <p><strong>MST:</strong> {quote.customerTaxCode}</p>}
            {quote.customerAddress && <p><strong>Địa chỉ:</strong> {quote.customerAddress}</p>}
            {quote.customerContactName && <p><strong>Liên hệ:</strong> {quote.customerContactName}</p>}
            {quote.customerContactTitle && <p><strong>Chức vụ:</strong> {quote.customerContactTitle}</p>}
            {quote.customerPhone && <p><strong>ĐT:</strong> {quote.customerPhone}</p>}
            {quote.customerEmail && <p><strong>Email:</strong> {quote.customerEmail}</p>}
          </section>
          <section>
            <h3>Nhân viên tư vấn</h3>
            {quote.salesName && <p><strong>{quote.salesName}</strong></p>}
            {quote.salesPhone && <p>{quote.salesPhone}</p>}
            {quote.salesEmail && <p>{quote.salesEmail}</p>}
            {quote.salesAddress && <p>{quote.salesAddress}</p>}
            <p className="quote-doc__quote-meta">
              <strong>Mã:</strong> {quote.quoteNo}<br />
              <strong>Ngày báo giá:</strong> {formatQuoteDate(quote.quoteDate)}<br />
              <strong>Hiệu lực đến:</strong> {formatQuoteDate(quote.validUntil)}<br />
              <strong>Loại tiền:</strong> {quote.currency} · <strong>Loại giá:</strong> {priceTypeLabel}
            </p>
          </section>
        </div>

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
                        <span className="quote-doc__muted">Chưa có</span>
                      )}
                    </td>
                    <td>{item.colorSnapshot || "—"}</td>
                    <td>{item.categorySnapshot || "—"}</td>
                    <td>{item.genderSnapshot || "—"}</td>
                    <td>
                      {[item.productNameSnapshot, item.variantNameSnapshot].filter(Boolean).join(" · ") || "—"}
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
                    {quote.showProductionLeadTime && <td>{item.productionLeadTime || "—"}</td>}
                    {quote.showSampleFee && (
                      <td>{item.sampleFee != null ? formatQuoteMoney(item.sampleFee, quote.currency) : "—"}</td>
                    )}
                    {quote.showSampleLeadTime && <td>{item.sampleLeadTime || "—"}</td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="quote-doc__totals">
          {quote.discountAmount > 0 && <p>Chiết khấu: {formatQuoteMoney(quote.discountAmount, quote.currency)}</p>}
          {quote.shippingFee > 0 && <p>Phí vận chuyển: {formatQuoteMoney(quote.shippingFee, quote.currency)}</p>}
          {quote.vatAmount > 0 && <p>VAT ({quote.vatRate}%): {formatQuoteMoney(quote.vatAmount, quote.currency)}</p>}
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

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff; }
          .quote-doc__table { font-size: 9px; }
        }
        .quote-doc { max-width: 1200px; margin: 0 auto; padding: 16px; }
        .quote-doc__paper {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 24px;
        }
        .quote-doc__header {
          display: flex;
          gap: 16px;
          border-bottom: 2px solid #111;
          padding-bottom: 16px;
          margin-bottom: 16px;
        }
        .quote-doc__logo { max-height: 56px; }
        .quote-doc__header-text h1 { margin: 0 0 8px; font-size: 22px; }
        .quote-doc__brand { font-weight: 600; }
        .quote-doc__meta-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          margin-bottom: 16px;
        }
        .quote-doc__meta-grid h3 { margin: 0 0 8px; font-size: 13px; text-transform: uppercase; }
        .quote-doc__meta-grid p { margin: 4px 0; font-size: 13px; }
        .quote-doc__table-wrap { overflow-x: auto; margin: 16px 0; }
        .quote-doc__table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
        }
        .quote-doc__table th,
        .quote-doc__table td {
          border: 1px solid #d1d5db;
          padding: 6px 8px;
          text-align: left;
          vertical-align: top;
        }
        .quote-doc__table th { background: #f3f4f6; font-weight: 600; white-space: nowrap; }
        .quote-doc__design-thumb { max-width: 48px; max-height: 48px; object-fit: contain; }
        .quote-doc__muted { color: #9ca3af; font-size: 11px; }
        .quote-doc__totals { text-align: right; margin-top: 16px; }
        .quote-doc__grand-total { font-size: 18px; margin-top: 8px; }
        .quote-doc__notes pre, .quote-doc__terms pre {
          white-space: pre-wrap;
          font-family: inherit;
          font-size: 13px;
        }
        .quote-doc__prepared { margin-top: 24px; text-align: right; }
        .quote-doc__actions { display: flex; gap: 12px; margin-top: 16px; flex-wrap: wrap; }
      `}</style>
    </div>
  );
}
