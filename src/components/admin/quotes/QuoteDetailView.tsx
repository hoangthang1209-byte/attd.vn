"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { QuoteStatus } from "@prisma/client";
import QuoteStatusBadge from "@/components/admin/quotes/QuoteStatusBadge";
import QuoteManufacturingEvidencePicker from "@/components/admin/quotes/QuoteManufacturingEvidencePicker";
import QuoteTotalsSummary from "@/components/admin/quotes/QuoteTotalsSummary";
import { QuotePartyColumns } from "@/components/quotes/QuoteDocumentSections";
import { formatQuoteCurrency, formatQuoteDate, formatQuoteDateTime } from "@/features/quotes/format";
import { computeQuoteFromItems } from "@/features/quotes/quote-totals";
import { useAdminMutation } from "@/hooks/useAdminAction";
import { useAdminToast } from "@/hooks/useAdminToast";
import { parseAdminJsonResponse } from "@/lib/admin/adminMutation";
import AdminPageSkeleton from "@/components/admin/feedback/AdminPageSkeleton";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";
import {
  downloadQuotePdfFromApi,
  quotePdfDownloadFilename,
} from "@/features/quotes/pdf/download-quote-pdf.client";
import {
  openQuotePdfInlineAdmin,
  quotePdfDownloadUrlAdmin,
} from "@/features/quotes/pdf/open-quote-pdf.client";
import { getQuotePublicUrl } from "@/features/quotes/quote-public-link.shared";

type QuoteDetail = {
  id: string;
  quoteNo: string;
  publicToken: string | null;
  publicShortCode: string | null;
  status: QuoteStatus;
  title: string | null;
  validUntil: string | null;
  quoteDate: string | null;
  currency: string;
  priceVatType: string;
  preparedBy: string | null;
  customerCompanySnapshot: string | null;
  customerTaxCodeSnapshot: string | null;
  customerAddressSnapshot: string | null;
  customerContactNameSnapshot: string | null;
  customerContactTitleSnapshot: string | null;
  customerPhoneSnapshot: string | null;
  customerEmailSnapshot: string | null;
  salesRepresentativeId: string | null;
  salesName: string | null;
  salesTitleSnapshot: string | null;
  salesPhone: string | null;
  salesEmail: string | null;
  salesAddress: string | null;
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
  customer: { id: string; name: string; code: string; phone: string | null; email: string | null } | null;
  contact: { id: string; fullName: string } | null;
  pricingCalculation: { id: string; code: string } | null;
  order: { id: string; orderNo: string } | null;
  items: Array<{
    id: string;
    productNameSnapshot: string | null;
    variantNameSnapshot: string | null;
    description: string | null;
    itemNote: string | null;
    quantity: number;
    unit: string;
    unitPrice: number;
    lineTotal: number;
    manualOverride: boolean;
    manualUnitPrice: number | null;
    marginAmount: number | null;
    marginRate: number | null;
    pricingSnapshot?: Record<string, unknown> | null;
  }>;
};

type CostingQuantityBreakRow = {
  quantity: number;
  suggestedSellingPricePerUnit: number;
  revenueBeforeVat: number;
  actualMarginRate: number;
};

export default function QuoteDetailView({ id }: { id: string }) {
  const router = useRouter();
  const mutate = useAdminMutation();
  const toast = useAdminToast();
  const [quote, setQuote] = useState<QuoteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
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
  }, [id]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function updateStatus(status: QuoteStatus) {
    setBusy(true);
    await mutate({
      loadingMessage: "Đang cập nhật trạng thái…",
      successMessage: "Đã cập nhật trạng thái.",
      action: async () => {
        const res = await fetch(`/api/quotes/${id}/status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
        return parseAdminJsonResponse(res, () => true);
      },
      onSuccess: async () => {
        await load();
      },
    });
    setBusy(false);
  }

  async function convertToOrder() {
    if (!window.confirm("Tạo đơn hàng từ báo giá này?")) return;
    setBusy(true);
    const order = await mutate({
      loadingMessage: "Đang tạo đơn hàng…",
      successMessage: "Đã tạo đơn hàng.",
      action: async () => {
        const res = await fetch(`/api/orders/from-quote/${id}`, { method: "POST" });
        return parseAdminJsonResponse(res, (body) => body.order as { id: string });
      },
    });
    setBusy(false);
    if (order) router.push(`/admin/orders/${order.id}`);
  }

  async function duplicateQuote() {
    setBusy(true);
    const duplicated = await mutate({
      loadingMessage: "Đang sao chép báo giá…",
      successMessage: "Đã sao chép báo giá.",
      action: async () => {
        const res = await fetch(`/api/quotes/${id}/duplicate`, { method: "POST" });
        return parseAdminJsonResponse(res, (body) => body.quote as { id: string });
      },
    });
    setBusy(false);
    if (duplicated) router.push(`/admin/quotes/${duplicated.id}`);
  }

  function publicUrl() {
    if (!quote?.quoteNo || !quote.publicShortCode) return null;
    return getQuotePublicUrl(
      { quoteNo: quote.quoteNo, publicShortCode: quote.publicShortCode },
      typeof window === "undefined" ? undefined : window.location.origin,
    );
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
      const apiUrl = quotePdfDownloadUrlAdmin(id);
      await downloadQuotePdfFromApi(
        apiUrl,
        quotePdfDownloadFilename(quote?.quoteNo ?? id),
      );
    } catch (err) {
      console.error("[QuoteDetailView] PDF download failed", err);
      toast.error(
        err instanceof Error
          ? err.message
          : "Không thể tạo file PDF giao diện báo giá. Vui lòng thử lại.",
      );
    } finally {
      setPdfDownloading(false);
    }
  }

  if (loading) return <AdminPageSkeleton message="Đang tải báo giá…" />;
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
  const costingQuantityBreaks: CostingQuantityBreakRow[] = quote.items
    .flatMap((item) => {
      const snapshot = item.pricingSnapshot;
      if (!snapshot || typeof snapshot !== "object") return [];
      const breaks = (snapshot as { quantityBreaks?: unknown }).quantityBreaks;
      if (!Array.isArray(breaks)) return [];
      return breaks
        .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object")
        .map((row) => ({
          quantity: typeof row.quantity === "number" ? row.quantity : 0,
          suggestedSellingPricePerUnit: typeof row.suggestedSellingPricePerUnit === "number" ? row.suggestedSellingPricePerUnit : 0,
          revenueBeforeVat: typeof row.revenueBeforeVat === "number" ? row.revenueBeforeVat : 0,
          actualMarginRate: typeof row.actualMarginRate === "number" ? row.actualMarginRate : 0,
        }))
        .filter((row) => Number.isFinite(row.quantity) && row.quantity > 0);
    })
    .sort((a, b) => a.quantity - b.quantity);

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
          <button type="button" className="admin-btn admin-btn--secondary" disabled={busy} aria-busy={busy} onClick={() => void duplicateQuote()}>Sao chép</button>
          <AdminLoadingButton variant="secondary" size="xs" pending={pdfDownloading} pendingLabel="Đang tạo PDF báo giá…" onClick={() => void downloadPdf()}>
            Tải PDF báo giá
          </AdminLoadingButton>
        </div>
      </div>

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

      <div className="quote-form__card" style={{ marginTop: 16 }}>
        <QuotePartyColumns
          quote={{
            customerCompany: quote.customerCompanySnapshot,
            customerCode: quote.customer?.code ?? null,
            customerTaxCode: quote.customerTaxCodeSnapshot,
            customerAddress: quote.customerAddressSnapshot,
            customerCompanyPhone: quote.customer?.phone ?? null,
            customerCompanyEmail: quote.customer?.email ?? null,
            customerContactName: quote.customerContactNameSnapshot,
            customerContactTitle: quote.customerContactTitleSnapshot,
            customerContactPhone: quote.customerPhoneSnapshot,
            customerContactEmail: quote.customerEmailSnapshot,
            salesName: quote.salesName,
            salesTitle: quote.salesTitleSnapshot,
            salesPhone: quote.salesPhone,
            salesEmail: quote.salesEmail,
            salesAddress: quote.salesAddress,
          }}
        />
      </div>

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
                  {item.itemNote && <div className="admin-field-hint">{item.itemNote}</div>}
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

      {costingQuantityBreaks.length > 0 && (
        <fieldset className="admin-catalog-fieldset" style={{ marginTop: 16 }}>
          <legend>Bảng giá theo số lượng từ costing</legend>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Số lượng</th>
                  <th>Giá bán / đơn vị</th>
                  <th>Tổng trước VAT</th>
                  <th>Margin %</th>
                </tr>
              </thead>
              <tbody>
                {costingQuantityBreaks.map((row, index) => (
                  <tr key={`${row.quantity}-${index}`}>
                    <td>{row.quantity.toLocaleString("vi-VN")}</td>
                    <td>{formatQuoteCurrency(row.suggestedSellingPricePerUnit)}</td>
                    <td>{formatQuoteCurrency(row.revenueBeforeVat)}</td>
                    <td>{row.actualMarginRate.toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </fieldset>
      )}

      <QuoteManufacturingEvidencePicker quoteId={id} />

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
            <button
              type="button"
              className="admin-btn admin-btn--secondary admin-btn--xs"
              onClick={() => openQuotePdfInlineAdmin(id)}
            >
              In / Lưu PDF
            </button>
            <AdminLoadingButton variant="primary" size="xs" pending={pdfDownloading} pendingLabel="Đang tạo PDF báo giá…" onClick={() => void downloadPdf()}>
              Tải PDF báo giá
            </AdminLoadingButton>
          </div>
        ) : (
          <p className="admin-field-hint">Liên kết sẽ được tạo khi gửi báo giá.</p>
        )}
      </fieldset>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 16 }}>
        <button type="button" className="admin-btn admin-btn--primary" disabled={busy} aria-busy={busy} onClick={() => void updateStatus("SENT")}>Gửi báo giá</button>
        <button type="button" className="admin-btn admin-btn--secondary" disabled={busy} aria-busy={busy} onClick={() => void updateStatus("ACCEPTED")}>Khách đồng ý</button>
        <button type="button" className="admin-btn admin-btn--secondary" disabled={busy} aria-busy={busy} onClick={() => void updateStatus("REJECTED")}>Khách từ chối</button>
        <button type="button" className="admin-btn admin-btn--secondary" disabled={busy} aria-busy={busy} onClick={() => void updateStatus("CANCELLED")}>Đã hủy</button>
        {quote.order ? (
          <Link href={`/admin/orders/${quote.order.id}`} className="admin-btn admin-btn--secondary">
            Đơn hàng {quote.order.orderNo}
          </Link>
        ) : quote.status === "ACCEPTED" ? (
          <AdminLoadingButton
            variant="primary"
            pending={busy}
            pendingLabel="Đang tạo đơn hàng…"
            onClick={() => void convertToOrder()}
          >
            Tạo đơn hàng
          </AdminLoadingButton>
        ) : null}
      </div>
    </div>
  );
}
