"use client";

import { useEffect, useState } from "react";
import { formatQuoteCurrency, formatQuoteDate } from "@/features/quotes/format";
import { getQuoteStatusLabel } from "@/features/quotes/labels";

type PublicQuote = {
  quoteNo: string;
  status: string;
  title: string | null;
  validUntil: string | null;
  customerName: string | null;
  subtotal: number;
  discountAmount: number;
  shippingFee: number;
  vatRate: number;
  vatAmount: number;
  totalAmount: number;
  manualOverride: boolean;
  manualTotalAmount: number | null;
  customerNote: string | null;
  terms: string | null;
  items: Array<{
    productNameSnapshot: string | null;
    variantNameSnapshot: string | null;
    description: string | null;
    quantity: number;
    unit: string;
    unitPrice: number;
    lineTotal: number;
  }>;
};

type Props = {
  token: string;
  company: { brandName: string; hotlineDisplay: string; email: string; address: string };
  logoUrl?: string | null;
};

export default function PublicQuoteDocument({ token, company, logoUrl }: Props) {
  const [quote, setQuote] = useState<PublicQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch(`/api/quotes/public/${token}`)
      .then(async (res) => {
        const data = await res.json() as { quote?: PublicQuote; message?: string };
        if (!res.ok) throw new Error(data.message ?? "Không tìm thấy báo giá");
        setQuote(data.quote ?? null);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div className="quote-public-page"><p>Đang tải báo giá…</p></div>;
  if (error || !quote) return <div className="quote-public-page"><p>{error ?? "Không tìm thấy báo giá"}</p></div>;

  const displayTotal = quote.manualOverride && quote.manualTotalAmount != null ? quote.manualTotalAmount : quote.totalAmount;

  return (
    <div className="quote-public-page">
      <div className="quote-public-doc" id="quote-print-area">
        <header className="quote-public-header">
          {logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={company.brandName} className="quote-public-logo" />
          )}
          <div>
            <h1>{company.brandName}</h1>
            <p>{company.address}</p>
            <p>{company.hotlineDisplay} · {company.email}</p>
          </div>
        </header>

        <section className="quote-public-meta">
          <h2>{quote.title ?? "Báo giá sản phẩm"}</h2>
          <p><strong>Mã báo giá:</strong> {quote.quoteNo}</p>
          <p><strong>Trạng thái:</strong> {getQuoteStatusLabel(quote.status as never)}</p>
          {quote.customerName && <p><strong>Khách hàng:</strong> {quote.customerName}</p>}
          <p><strong>Hiệu lực đến:</strong> {formatQuoteDate(quote.validUntil)}</p>
        </section>

        <table className="quote-public-table">
          <thead>
            <tr>
              <th>Sản phẩm / dịch vụ</th>
              <th>Số lượng</th>
              <th>Đơn giá</th>
              <th>Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            {quote.items.map((item, i) => (
              <tr key={i}>
                <td>
                  {item.productNameSnapshot}
                  {item.variantNameSnapshot && <> · {item.variantNameSnapshot}</>}
                  {item.description && <div className="quote-public-desc">{item.description}</div>}
                </td>
                <td>{item.quantity} {item.unit}</td>
                <td>{formatQuoteCurrency(item.unitPrice)}</td>
                <td>{formatQuoteCurrency(item.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="quote-public-totals">
          <p>Tạm tính: {formatQuoteCurrency(quote.subtotal)}</p>
          {quote.discountAmount > 0 && <p>Chiết khấu: {formatQuoteCurrency(quote.discountAmount)}</p>}
          {quote.shippingFee > 0 && <p>Phí vận chuyển: {formatQuoteCurrency(quote.shippingFee)}</p>}
          {quote.vatAmount > 0 && <p>VAT ({quote.vatRate}%): {formatQuoteCurrency(quote.vatAmount)}</p>}
          <p className="quote-public-total"><strong>Tổng cộng: {formatQuoteCurrency(displayTotal)}</strong></p>
        </div>

        {quote.customerNote && (
          <section>
            <h3>Ghi chú</h3>
            <p>{quote.customerNote}</p>
          </section>
        )}

        {quote.terms && (
          <section>
            <h3>Điều khoản báo giá</h3>
            <pre className="quote-public-terms">{quote.terms}</pre>
          </section>
        )}

        <section className="quote-public-cta">
          <p>Liên hệ {company.brandName} để xác nhận báo giá:</p>
          <p>{company.hotlineDisplay} · {company.email}</p>
        </section>
      </div>

      <div className="quote-public-actions no-print">
        <button type="button" className="admin-btn admin-btn--primary" onClick={() => window.print()}>
          In / Lưu PDF
        </button>
      </div>

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff; }
        }
        .quote-public-page {
          max-width: 900px;
          margin: 0 auto;
          padding: 24px 16px 48px;
          font-family: system-ui, sans-serif;
          color: #111;
        }
        .quote-public-doc {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 24px;
        }
        .quote-public-header {
          display: flex;
          gap: 16px;
          align-items: flex-start;
          margin-bottom: 24px;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 16px;
        }
        .quote-public-logo { max-height: 48px; }
        .quote-public-table {
          width: 100%;
          border-collapse: collapse;
          margin: 16px 0;
        }
        .quote-public-table th,
        .quote-public-table td {
          border: 1px solid #e5e7eb;
          padding: 8px 10px;
          text-align: left;
        }
        .quote-public-desc { font-size: 12px; color: #666; margin-top: 4px; }
        .quote-public-totals { text-align: right; margin-top: 16px; }
        .quote-public-total { font-size: 18px; margin-top: 8px; }
        .quote-public-terms { white-space: pre-wrap; font-family: inherit; font-size: 14px; }
        .quote-public-actions { margin-top: 16px; }
      `}</style>
    </div>
  );
}
