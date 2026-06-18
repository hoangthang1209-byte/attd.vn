"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getPricingStatusLabel } from "@/features/pricing/labels";
import { formatPricingCurrency, formatPricingDateTime, formatPricingPercent } from "@/features/pricing/format";

type CalculationDetail = {
  id: string;
  code: string;
  status: string;
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
  manualOverrideReason: string | null;
  internalNote: string | null;
  createdAt: string;
  warnings: string[];
  lead: { id: string; fullName: string; code: string | null } | null;
  customer: { id: string; name: string; code: string } | null;
  contact: { id: string; fullName: string } | null;
  priceGroup: { id: string; name: string; code: string } | null;
  items: Array<{
    id: string;
    productNameSnapshot: string | null;
    variantNameSnapshot: string | null;
    quantity: number;
    unit: string;
    baseUnitPrice: number;
    serviceFee: number;
    setupFee: number;
    unitPrice: number;
    lineTotal: number;
    marginAmount: number | null;
    marginRate: number | null;
    manualOverride: boolean;
    manualUnitPrice: number | null;
  }>;
  resultSnapshot: unknown;
};

export default function PricingCalculationDetail({ id }: { id: string }) {
  const [calc, setCalc] = useState<CalculationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch(`/api/pricing/calculations/${id}`)
      .then(async (res) => {
        const data = await res.json() as { calculation?: CalculationDetail; message?: string };
        if (!res.ok) throw new Error(data.message ?? "Không tìm thấy");
        setCalc(data.calculation ?? null);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="admin-loading">Đang tải...</p>;
  if (error || !calc) {
    return (
      <div className="admin-empty-state admin-empty-state--error">
        <p>{error ?? "Không tìm thấy bản tính giá"}</p>
        <Link href="/admin/pricing/history" className="admin-btn">Quay lại</Link>
      </div>
    );
  }

  const displayTotal = calc.manualOverride && calc.manualTotalAmount != null
    ? calc.manualTotalAmount
    : calc.totalAmount;

  return (
    <div className="admin-panel">
      <div className="admin-section-header">
        <div>
          <h3 className="admin-subtitle" style={{ margin: 0 }}>{calc.code}</h3>
          <p className="admin-field-hint">{getPricingStatusLabel(calc.status as never)} · {formatPricingDateTime(calc.createdAt)}</p>
        </div>
        <Link href="/admin/pricing/history" className="admin-btn admin-btn--secondary">← Lịch sử</Link>
      </div>

      <div className="admin-catalog-kpi-bar">
        <div className="admin-catalog-kpi"><strong>{calc.lead ? calc.lead.fullName : "—"}</strong><span>Lead</span></div>
        <div className="admin-catalog-kpi"><strong>{calc.customer?.name ?? "—"}</strong><span>Khách hàng</span></div>
        <div className="admin-catalog-kpi"><strong>{calc.priceGroup?.name ?? "—"}</strong><span>Nhóm giá</span></div>
        <div className="admin-catalog-kpi admin-catalog-kpi--ok"><strong>{formatPricingCurrency(displayTotal)}</strong><span>Tổng cộng</span></div>
      </div>

      {calc.warnings.length > 0 && (
        <ul className="admin-kb-warning-list">
          {calc.warnings.map((w) => <li key={w}>{w}</li>)}
        </ul>
      )}

      {calc.lead && (
        <p className="admin-field-hint">Lead: <Link href={`/admin/crm/leads/${calc.lead.id}`}>{calc.lead.fullName}</Link></p>
      )}
      {calc.customer && (
        <p className="admin-field-hint">Khách hàng: <Link href={`/admin/crm/customers/${calc.customer.id}`}>{calc.customer.name}</Link></p>
      )}

      <h4 className="admin-subtitle">Chi tiết dòng sản phẩm</h4>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Sản phẩm</th>
              <th>SL</th>
              <th>Đơn giá gốc</th>
              <th>Phí DV</th>
              <th>Setup</th>
              <th>Đơn giá</th>
              <th>Thành tiền</th>
              <th>Biên lợi nhuận</th>
            </tr>
          </thead>
          <tbody>
            {calc.items.map((item) => (
              <tr key={item.id}>
                <td>
                  {item.productNameSnapshot}
                  {item.variantNameSnapshot && <span className="admin-field-hint"> · {item.variantNameSnapshot}</span>}
                  {item.manualOverride && <span className="admin-kb-badge admin-kb-badge--medium"> Chỉnh tay</span>}
                </td>
                <td>{item.quantity} {item.unit}</td>
                <td>{formatPricingCurrency(item.baseUnitPrice)}</td>
                <td>{formatPricingCurrency(item.serviceFee)}</td>
                <td>{formatPricingCurrency(item.setupFee)}</td>
                <td>{formatPricingCurrency(item.manualOverride && item.manualUnitPrice != null ? item.manualUnitPrice : item.unitPrice)}</td>
                <td>{formatPricingCurrency(item.lineTotal)}</td>
                <td>
                  {item.marginAmount != null ? (
                    <>{formatPricingCurrency(item.marginAmount)} ({formatPricingPercent(item.marginRate)})</>
                  ) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <fieldset className="admin-catalog-fieldset" style={{ marginTop: 24 }}>
        <legend>Tổng hợp</legend>
        <div className="admin-seo-brief-form-grid">
          <div><span className="admin-field-hint">Tạm tính</span><br /><strong>{formatPricingCurrency(calc.subtotal)}</strong></div>
          <div><span className="admin-field-hint">Phí dịch vụ</span><br /><strong>{formatPricingCurrency(calc.serviceTotal)}</strong></div>
          <div><span className="admin-field-hint">Phí setup</span><br /><strong>{formatPricingCurrency(calc.setupTotal)}</strong></div>
          <div><span className="admin-field-hint">Chiết khấu</span><br /><strong>{formatPricingCurrency(calc.discountAmount)}</strong></div>
          <div><span className="admin-field-hint">Phí vận chuyển</span><br /><strong>{formatPricingCurrency(calc.shippingFee)}</strong></div>
          <div><span className="admin-field-hint">VAT ({calc.vatRate}%)</span><br /><strong>{formatPricingCurrency(calc.vatAmount)}</strong></div>
          <div><span className="admin-field-hint">Giá đề xuất</span><br /><strong>{formatPricingCurrency(calc.totalAmount)}</strong></div>
          {calc.manualOverride && (
            <div><span className="admin-field-hint">Giá chỉnh tay</span><br /><strong>{formatPricingCurrency(calc.manualTotalAmount)}</strong></div>
          )}
        </div>
        {calc.manualOverrideReason && (
          <p className="admin-field-hint" style={{ marginTop: 12 }}>Lý do chỉnh giá: {calc.manualOverrideReason}</p>
        )}
        {calc.internalNote && (
          <p className="admin-field-hint">Ghi chú nội bộ: {calc.internalNote}</p>
        )}
      </fieldset>

      <div style={{ marginTop: 24 }}>
        <button type="button" className="admin-btn admin-btn--secondary" disabled title="Sẽ triển khai ở Sprint 26.2.0">
          Tạo báo giá (Sprint 26.2.0)
        </button>
      </div>

      <details className="admin-import-error-detail" style={{ marginTop: 24 }}>
        <summary>Snapshot (debug)</summary>
        <pre style={{ fontSize: 11, overflow: "auto" }}>{JSON.stringify(calc.resultSnapshot, null, 2)}</pre>
      </details>
    </div>
  );
}
