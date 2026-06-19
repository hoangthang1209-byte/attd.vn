"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { QuoteStatus } from "@prisma/client";
import QuoteStatusBadge from "@/components/admin/quotes/QuoteStatusBadge";
import QuoteTotalsSummary from "@/components/admin/quotes/QuoteTotalsSummary";
import { formatQuoteCurrency, formatQuoteDate, formatQuoteDateTime } from "@/features/quotes/format";
import { computeQuoteFromItems } from "@/features/quotes/quote-totals";

type QuoteDetail = {
  id: string;
  quoteNo: string;
  publicToken: string | null;
  status: QuoteStatus;
  title: string | null;
  validUntil: string | null;
  customerNote: string | null;
  internalNote: string | null;
  terms: string | null;
  manualOverrideReason: string | null;
  subtotal: number;
  serviceTotal: number;
  setupTotal: number;
  discountAmount: number;
  shippingFee: number;
  vatRate: number;
  vatAmount: number;
  totalAmount: number;
  manualOverride: boolean;
  manualTotalAmount: number | null;
  createdAt: string;
  lead: { id: string; fullName: string; code: string | null } | null;
  customer: { id: string; name: string; code: string } | null;
  contact: { id: string; fullName: string } | null;
  pricingCalculation: { id: string; code: string } | null;
  items: Array<{
    id: string;
    productNameSnapshot: string | null;
    variantNameSnapshot: string | null;
    description: string | null;
    quantity: number;
    unit: string;
    unitPrice: number;
    lineTotal: number;
    manualOverride: boolean;
    manualUnitPrice: number | null;
    marginAmount: number | null;
  }>;
};

export default function QuoteDetailView({ id }: { id: string }) {
  const router = useRouter();
  const [quote, setQuote] = useState<QuoteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/quotes/${id}`);
    const data = await res.json() as { quote?: QuoteDetail; message?: string };
    if (!res.ok) {
      setError(data.message ?? "Không tìm thấy báo giá");
      setQuote(null);
    } else {
      setQuote(data.quote ?? null);
    }
    setLoading(false);
  }

  useEffect(() => { void load(); }, [id]);

  async function updateStatus(status: QuoteStatus) {
    setMessage(null);
    const res = await fetch(`/api/quotes/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await res.json() as { message?: string };
    if (!res.ok) {
      setMessage(data.message ?? "Không thể cập nhật trạng thái");
      return;
    }
    await load();
    setMessage("Đã cập nhật trạng thái");
  }

  async function duplicateQuote() {
    const res = await fetch(`/api/quotes/${id}/duplicate`, { method: "POST" });
    const data = await res.json() as { quote?: { id: string }; message?: string };
    if (!res.ok) {
      setMessage(data.message ?? "Không thể sao chép");
      return;
    }
    router.push(`/admin/quotes/${data.quote!.id}`);
  }

  function publicUrl() {
    if (!quote?.publicToken) return null;
    if (typeof window === "undefined") return `/q/${quote.publicToken}`;
    return `${window.location.origin}/q/${quote.publicToken}`;
  }

  async function copyLink() {
    const url = publicUrl();
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const [pdfDownloading, setPdfDownloading] = useState(false);

  async function downloadPdf() {
    setPdfDownloading(true);
    try {
      const res = await fetch(`/api/quotes/${id}/pdf`);
      if (!res.ok) throw new Error("PDF failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bao-gia-${quote?.quoteNo ?? id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setMessage("Không thể tạo PDF. Vui lòng thử lại.");
    } finally {
      setPdfDownloading(false);
    }
  }

  if (loading) return <p className="admin-loading">Đang tải...</p>;
  if (error || !quote) {
    return (
      <div className="admin-empty-state admin-empty-state--error">
        <p>{error ?? "Không tìm thấy báo giá"}</p>
        <Link href="/admin/quotes" className="admin-btn">Quay lại</Link>
      </div>
    );
  }

  const totals = computeQuoteFromItems(quote.items.map((item) => ({
    quantity: item.quantity,
    unit: item.unit,
    baseUnitPrice: item.unitPrice,
    unitPrice: item.unitPrice,
    lineTotal: item.lineTotal,
    discountAmount: 0,
  })), {
    discountAmount: quote.discountAmount,
    shippingFee: quote.shippingFee,
    vatRate: quote.vatRate,
    manualTotalAmount: quote.manualTotalAmount,
  }).totals;

  const url = publicUrl();

  return (
    <div className="admin-panel">
      <div className="admin-section-header">
        <div>
          <p className="admin-crm-detail-code">{quote.quoteNo}</p>
          <h2>{quote.title ?? "Báo giá"}</h2>
          <QuoteStatusBadge status={quote.status} />
          <p className="admin-field-hint">Tạo lúc {formatQuoteDateTime(quote.createdAt)} · Hiệu lực đến {formatQuoteDate(quote.validUntil)}</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href={`/admin/quotes/${id}/edit`} className="admin-btn admin-btn--secondary">Chỉnh sửa</Link>
          <button type="button" className="admin-btn admin-btn--secondary" onClick={() => void duplicateQuote()}>Sao chép</button>
          <button type="button" className="admin-btn admin-btn--secondary" disabled={pdfDownloading} onClick={() => void downloadPdf()}>
            {pdfDownloading ? "Đang tạo PDF..." : "Tải PDF báo giá"}
          </button>
        </div>
      </div>

      {message && <p className="admin-field-hint">{message}</p>}

      {(quote.status === "ACCEPTED" || quote.status === "REJECTED") && (
        <p className="admin-field-hint" style={{ color: "var(--admin-warning, #b45309)" }}>
          Báo giá đã phản hồi, hãy cân nhắc tạo báo giá mới nếu thay đổi lớn.
        </p>
      )}

      <div className="admin-catalog-kpi-bar">
        <div className="admin-catalog-kpi"><strong>{quote.customer?.name ?? "—"}</strong><span>Khách hàng</span></div>
        <div className="admin-catalog-kpi"><strong>{quote.lead?.fullName ?? "—"}</strong><span>Lead</span></div>
        <div className="admin-catalog-kpi admin-catalog-kpi--ok"><strong>{formatQuoteCurrency(quote.manualOverride && quote.manualTotalAmount != null ? quote.manualTotalAmount : quote.totalAmount)}</strong><span>Tổng cộng</span></div>
      </div>

      {quote.lead && <p className="admin-field-hint">Lead: <Link href={`/admin/crm/leads/${quote.lead.id}`}>{quote.lead.fullName}</Link></p>}
      {quote.customer && <p className="admin-field-hint">Khách hàng: <Link href={`/admin/crm/customers/${quote.customer.id}`}>{quote.customer.name}</Link></p>}
      {quote.pricingCalculation && <p className="admin-field-hint">Từ bản tính giá: <Link href={`/admin/pricing/history/${quote.pricingCalculation.id}`}>{quote.pricingCalculation.code}</Link></p>}

      <div className="admin-table-wrap" style={{ marginTop: 16 }}>
        <table className="admin-table">
          <thead>
            <tr><th>Sản phẩm / dịch vụ</th><th>SL</th><th>Đơn giá</th><th>Thành tiền</th></tr>
          </thead>
          <tbody>
            {quote.items.map((item) => (
              <tr key={item.id}>
                <td>
                  {item.productNameSnapshot}
                  {item.variantNameSnapshot && <span className="admin-field-hint"> · {item.variantNameSnapshot}</span>}
                  {item.description && <div className="admin-field-hint">{item.description}</div>}
                </td>
                <td>{item.quantity} {item.unit}</td>
                <td>{formatQuoteCurrency(item.manualOverride && item.manualUnitPrice != null ? item.manualUnitPrice : item.unitPrice)}</td>
                <td>{formatQuoteCurrency(item.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <QuoteTotalsSummary totals={totals} />

      {quote.customerNote && <p className="admin-field-hint" style={{ marginTop: 12 }}><strong>Ghi chú gửi khách:</strong> {quote.customerNote}</p>}
      {quote.internalNote && <p className="admin-field-hint"><strong>Ghi chú nội bộ:</strong> {quote.internalNote}</p>}
      {quote.terms && <pre className="admin-field-hint" style={{ whiteSpace: "pre-wrap" }}>{quote.terms}</pre>}

      <fieldset className="admin-catalog-fieldset" style={{ marginTop: 24 }}>
        <legend>Liên kết công khai</legend>
        {url ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <code>{url}</code>
            <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" onClick={() => void copyLink()}>{copied ? "Đã sao chép" : "Sao chép liên kết"}</button>
            <a href={url} target="_blank" rel="noopener noreferrer" className="admin-btn admin-btn--secondary admin-btn--xs">Mở trang báo giá</a>
            <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" onClick={() => window.open(url, "_blank")?.print()}>In / Lưu PDF</button>
            <button type="button" className="admin-btn admin-btn--primary admin-btn--xs" disabled={pdfDownloading} onClick={() => void downloadPdf()}>
              {pdfDownloading ? "Đang tạo PDF..." : "Tải PDF báo giá"}
            </button>
          </div>
        ) : (
          <p className="admin-field-hint">Liên kết sẽ được tạo khi gửi báo giá.</p>
        )}
      </fieldset>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 16 }}>
        <button type="button" className="admin-btn admin-btn--primary" onClick={() => void updateStatus("SENT")}>Gửi báo giá</button>
        <button type="button" className="admin-btn admin-btn--secondary" onClick={() => void updateStatus("ACCEPTED")}>Khách đồng ý</button>
        <button type="button" className="admin-btn admin-btn--secondary" onClick={() => void updateStatus("REJECTED")}>Khách từ chối</button>
        <button type="button" className="admin-btn admin-btn--secondary" onClick={() => void updateStatus("CANCELLED")}>Đã hủy</button>
        <button type="button" className="admin-btn admin-btn--secondary" disabled title="Sẽ triển khai ở Sprint 26.3.0">Chuyển thành đơn hàng</button>
      </div>
      <p className="admin-field-hint">Chuyển thành đơn hàng — Sẽ triển khai ở Sprint 26.3.0</p>
    </div>
  );
}
