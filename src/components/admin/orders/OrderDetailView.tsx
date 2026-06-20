"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { OrderPaymentMethod, OrderPaymentType, OrderStatus } from "@prisma/client";
import OrderStatusBadge from "@/components/admin/orders/OrderStatusBadge";
import {
  formatOrderCurrency,
  formatOrderDate,
  formatOrderDateTime,
  toDateTimeLocalValue,
} from "@/features/orders/order-format";
import {
  getAllowedOrderStatusTransitions,
  orderStatusActionLabel,
} from "@/features/orders/order-status";
import {
  ORDER_PAYMENT_METHOD_LABELS,
  ORDER_PAYMENT_STATE_LABELS,
  ORDER_PAYMENT_STATUS_LABELS,
  ORDER_PAYMENT_TYPE_LABELS,
} from "@/features/orders/order-labels";
import type { OrderDetailRecord } from "@/features/orders/order.types";

type Props = { id: string };

export default function OrderDetailView({ id }: Props) {
  const [order, setOrder] = useState<OrderDetailRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentType, setPaymentType] = useState<OrderPaymentType>("DEPOSIT");
  const [paymentMethod, setPaymentMethod] = useState<OrderPaymentMethod>("BANK_TRANSFER");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(toDateTimeLocalValue());
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNote, setPaymentNote] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/orders/${id}`);
    const data = await res.json() as { order?: OrderDetailRecord; message?: string };
    if (!res.ok) {
      setError(data.message ?? "Không tìm thấy đơn hàng");
      setOrder(null);
    } else {
      setOrder(data.order ?? null);
    }
    setLoading(false);
  }

  useEffect(() => { void load(); }, [id]);

  async function updateStatus(status: OrderStatus, reason?: string) {
    setBusy(true);
    setMessage(null);
    const res = await fetch(`/api/orders/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, cancelReason: reason ?? null }),
    });
    const data = await res.json() as { order?: OrderDetailRecord; message?: string };
    setBusy(false);
    if (!res.ok) {
      setMessage(data.message ?? "Không thể cập nhật trạng thái");
      return;
    }
    setOrder(data.order ?? null);
    setCancelOpen(false);
    setCancelReason("");
    setMessage("Đã cập nhật trạng thái đơn hàng");
  }

  async function submitPayment(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const res = await fetch(`/api/orders/${id}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: paymentType,
        method: paymentMethod,
        amount: Number(paymentAmount),
        paidAt: new Date(paymentDate).toISOString(),
        referenceCode: paymentReference || null,
        note: paymentNote || null,
      }),
    });
    const data = await res.json() as { order?: OrderDetailRecord; message?: string };
    setBusy(false);
    if (!res.ok) {
      setMessage(data.message ?? "Không thể ghi nhận thanh toán");
      return;
    }
    setOrder(data.order ?? null);
    setPaymentOpen(false);
    setPaymentAmount("");
    setPaymentReference("");
    setPaymentNote("");
    setMessage("Đã ghi nhận thanh toán");
  }

  async function voidPayment(paymentId: string) {
    const reason = window.prompt("Lý do hủy ghi nhận (tuỳ chọn):");
    if (reason === null) return;
    setBusy(true);
    setMessage(null);
    const res = await fetch(`/api/orders/${id}/payments/${paymentId}/void`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ voidReason: reason || null }),
    });
    const data = await res.json() as { order?: OrderDetailRecord; message?: string };
    setBusy(false);
    if (!res.ok) {
      setMessage(data.message ?? "Không thể hủy ghi nhận");
      return;
    }
    setOrder(data.order ?? null);
    setMessage("Đã hủy ghi nhận thanh toán");
  }

  if (loading) return <p className="admin-loading">Đang tải...</p>;
  if (error || !order) {
    return (
      <div className="admin-empty-state admin-empty-state--error">
        <p>{error ?? "Không tìm thấy đơn hàng"}</p>
        <Link href="/admin/orders" className="admin-btn">Quay lại</Link>
      </div>
    );
  }

  const transitions = getAllowedOrderStatusTransitions(order.status);
  const canRecordPayment = order.status !== "COMPLETED" && order.status !== "CANCELLED";

  return (
    <div className="admin-panel">
      <div className="admin-section-header">
        <div>
          <p className="admin-crm-detail-code">{order.orderNo}</p>
          <h2>Đơn hàng {order.sourceQuoteNo ? `từ ${order.sourceQuoteNo}` : ""}</h2>
          <OrderStatusBadge status={order.status} />
          <p className="admin-field-hint">
            Tạo lúc {formatOrderDateTime(order.createdAt)}
            {order.sourceQuoteNo && order.quote && (
              <> · Báo giá nguồn: <Link href={`/admin/quotes/${order.quote.id}`}>{order.sourceQuoteNo}</Link></>
            )}
            {order.customer && (
              <> · Khách hàng: <Link href={`/admin/crm/customers/${order.customer.id}`}>{order.customer.name}</Link></>
            )}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {transitions.filter((s) => s !== "CANCELLED").map((status) => {
            const label = orderStatusActionLabel(status);
            if (!label) return null;
            return (
              <button
                key={status}
                type="button"
                className="admin-btn admin-btn--primary"
                disabled={busy}
                onClick={() => void updateStatus(status)}
              >
                {label}
              </button>
            );
          })}
          {transitions.includes("CANCELLED") && (
            <button type="button" className="admin-btn admin-btn--secondary" disabled={busy} onClick={() => setCancelOpen(true)}>
              Hủy đơn
            </button>
          )}
        </div>
      </div>

      {message && <p className="admin-field-hint">{message}</p>}

      <div className="admin-catalog-kpi-bar">
        <div className="admin-catalog-kpi">
          <strong>{formatOrderCurrency(order.financials.totalAmount, order.currency)}</strong>
          <span>Tổng giá trị</span>
        </div>
        <div className="admin-catalog-kpi admin-catalog-kpi--ok">
          <strong>{formatOrderCurrency(order.financials.paidAmount, order.currency)}</strong>
          <span>Đã thanh toán</span>
        </div>
        <div className="admin-catalog-kpi">
          <strong>{formatOrderCurrency(order.financials.outstandingAmount, order.currency)}</strong>
          <span>Còn phải thu</span>
        </div>
        <div className="admin-catalog-kpi">
          <strong>{ORDER_PAYMENT_STATE_LABELS[order.financials.paymentState]}</strong>
          <span>Trạng thái thanh toán</span>
        </div>
        {order.financials.overpaidAmount > 0 && (
          <div className="admin-catalog-kpi">
            <strong>{formatOrderCurrency(order.financials.overpaidAmount, order.currency)}</strong>
            <span>Thanh toán vượt</span>
          </div>
        )}
      </div>

      <div className="quote-form__party-grid" style={{ marginTop: 16 }}>
        <fieldset className="quote-form__party-col admin-catalog-fieldset">
          <legend>Thông tin khách hàng</legend>
          <p>{order.customerCompanyName ?? "—"}</p>
          {order.customerCode && <p className="admin-field-hint">Mã: {order.customerCode}</p>}
          {order.customerTaxCode && <p className="admin-field-hint">MST: {order.customerTaxCode}</p>}
          {order.customerAddress && <p className="admin-field-hint">{order.customerAddress}</p>}
          {order.contactName && <p className="admin-field-hint">Liên hệ: {order.contactName}{order.contactTitle ? ` · ${order.contactTitle}` : ""}</p>}
          {order.contactPhone && <p className="admin-field-hint">SĐT: {order.contactPhone}</p>}
          {order.contactEmail && <p className="admin-field-hint">Email: {order.contactEmail}</p>}
        </fieldset>

        <fieldset className="quote-form__party-col admin-catalog-fieldset">
          <legend>Thông tin đơn hàng</legend>
          <p className="admin-field-hint">Ngày đơn: {formatOrderDate(order.orderDate)}</p>
          {order.sourceQuoteDate && <p className="admin-field-hint">Ngày báo giá: {formatOrderDate(order.sourceQuoteDate)}</p>}
          {order.salesName && <p className="admin-field-hint">Tư vấn: {order.salesName}{order.salesTitle ? ` · ${order.salesTitle}` : ""}</p>}
          {order.sampleFee != null && order.sampleFee > 0 && (
            <p className="admin-field-hint">Phí mẫu: {formatOrderCurrency(order.sampleFee, order.currency)}</p>
          )}
          {order.sampleLeadTime && <p className="admin-field-hint">Thời gian làm mẫu: {order.sampleLeadTime}</p>}
          {order.sampleRefundCondition && (
            <pre className="admin-field-hint" style={{ whiteSpace: "pre-wrap" }}>{order.sampleRefundCondition}</pre>
          )}
        </fieldset>
      </div>

      {order.terms && (
        <fieldset className="admin-catalog-fieldset" style={{ marginTop: 16 }}>
          <legend>Điều khoản báo giá</legend>
          <pre className="admin-field-hint" style={{ whiteSpace: "pre-wrap" }}>{order.terms}</pre>
        </fieldset>
      )}

      <fieldset className="admin-catalog-fieldset" style={{ marginTop: 16 }}>
        <legend>Sản phẩm đặt hàng</legend>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Sản phẩm</th>
                <th>SKU</th>
                <th>Màu</th>
                <th>SL</th>
                <th>Đơn giá</th>
                <th>Thành tiền</th>
                <th>Thời gian SX</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td>
                    {[item.productNameSnapshot, item.variantNameSnapshot].filter(Boolean).join(" · ") || "—"}
                    {item.description && <div className="admin-field-hint">{item.description}</div>}
                    {item.itemNote && <div className="admin-field-hint">Ghi chú: {item.itemNote}</div>}
                  </td>
                  <td>{item.skuSnapshot ?? "—"}</td>
                  <td>{item.colorSnapshot ?? "—"}</td>
                  <td>{item.quantity} {item.unit}</td>
                  <td>{formatOrderCurrency(item.unitPrice, order.currency)}</td>
                  <td>{formatOrderCurrency(item.lineTotal, order.currency)}</td>
                  <td>{item.productionLeadTime ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </fieldset>

      <fieldset className="admin-catalog-fieldset" style={{ marginTop: 16 }}>
        <legend>Thanh toán</legend>
        {canRecordPayment && (
          <button type="button" className="admin-btn admin-btn--primary admin-btn--small" style={{ marginBottom: 12 }} onClick={() => setPaymentOpen(true)}>
            Ghi nhận thanh toán
          </button>
        )}
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Ngày</th>
                <th>Loại</th>
                <th>Phương thức</th>
                <th>Mã tham chiếu</th>
                <th>Ghi chú</th>
                <th>Số tiền</th>
                <th>Trạng thái</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {order.payments.length === 0 ? (
                <tr><td colSpan={8}>Chưa có ghi nhận thanh toán</td></tr>
              ) : order.payments.map((p) => (
                <tr key={p.id}>
                  <td>{formatOrderDateTime(p.paidAt)}</td>
                  <td>{ORDER_PAYMENT_TYPE_LABELS[p.type]}</td>
                  <td>{ORDER_PAYMENT_METHOD_LABELS[p.method]}</td>
                  <td>{p.referenceCode ?? "—"}</td>
                  <td>{p.note ?? "—"}</td>
                  <td>{formatOrderCurrency(p.amount, order.currency)}</td>
                  <td>{ORDER_PAYMENT_STATUS_LABELS[p.status]}</td>
                  <td>
                    {p.status === "CONFIRMED" && canRecordPayment ? (
                      <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" disabled={busy} onClick={() => void voidPayment(p.id)}>
                        Hủy ghi nhận
                      </button>
                    ) : p.status === "VOID" ? (
                      <span className="admin-field-hint">Đã hủy</span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </fieldset>

      <fieldset className="admin-catalog-fieldset" style={{ marginTop: 16 }}>
        <legend>Nhật ký đơn hàng</legend>
        {order.activities.length === 0 ? (
          <p className="admin-field-hint">Chưa có hoạt động</p>
        ) : (
          <ul className="order-activity-timeline">
            {order.activities.map((activity) => (
              <li key={activity.id}>
                <strong>{activity.title}</strong>
                <span className="admin-field-hint"> · {formatOrderDateTime(activity.createdAt)}</span>
                {activity.detail && <p className="admin-field-hint">{activity.detail}</p>}
              </li>
            ))}
          </ul>
        )}
      </fieldset>

      {cancelOpen && (
        <div className="quote-quick-contact-modal">
          <div className="quote-quick-contact-modal__backdrop" onClick={() => setCancelOpen(false)} />
          <form
            className="quote-quick-contact-modal__panel"
            onSubmit={(e) => {
              e.preventDefault();
              void updateStatus("CANCELLED", cancelReason);
            }}
          >
            <h3 className="quote-quick-contact-modal__title">Hủy đơn hàng</h3>
            <div className="admin-field">
              <label className="admin-label">Lý do hủy đơn hàng</label>
              <textarea className="admin-textarea" rows={3} required value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
            </div>
            <div className="quote-quick-contact-modal__actions">
              <button type="button" className="admin-btn admin-btn--secondary" onClick={() => setCancelOpen(false)}>Đóng</button>
              <button type="submit" className="admin-btn admin-btn--primary" disabled={busy}>Xác nhận hủy</button>
            </div>
          </form>
        </div>
      )}

      {paymentOpen && (
        <div className="quote-quick-contact-modal">
          <div className="quote-quick-contact-modal__backdrop" onClick={() => setPaymentOpen(false)} />
          <form className="quote-quick-contact-modal__panel" onSubmit={(e) => void submitPayment(e)}>
            <h3 className="quote-quick-contact-modal__title">Ghi nhận thanh toán</h3>
            <div className="admin-field">
              <label className="admin-label">Loại thanh toán</label>
              <select className="admin-input" value={paymentType} onChange={(e) => setPaymentType(e.target.value as OrderPaymentType)}>
                {(Object.keys(ORDER_PAYMENT_TYPE_LABELS) as OrderPaymentType[]).map((t) => (
                  <option key={t} value={t}>{ORDER_PAYMENT_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>
            <div className="admin-field">
              <label className="admin-label">Phương thức</label>
              <select className="admin-input" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as OrderPaymentMethod)}>
                {(Object.keys(ORDER_PAYMENT_METHOD_LABELS) as OrderPaymentMethod[]).map((m) => (
                  <option key={m} value={m}>{ORDER_PAYMENT_METHOD_LABELS[m]}</option>
                ))}
              </select>
            </div>
            <div className="admin-field">
              <label className="admin-label">Số tiền</label>
              <input className="admin-input" type="number" min="1" required value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} />
            </div>
            <div className="admin-field">
              <label className="admin-label">Ngày thanh toán</label>
              <input className="admin-input" type="datetime-local" required value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
            </div>
            <div className="admin-field">
              <label className="admin-label">Mã tham chiếu</label>
              <input className="admin-input" value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} />
            </div>
            <div className="admin-field">
              <label className="admin-label">Ghi chú</label>
              <textarea className="admin-textarea" rows={2} value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)} />
            </div>
            <div className="quote-quick-contact-modal__actions">
              <button type="button" className="admin-btn admin-btn--secondary" onClick={() => setPaymentOpen(false)}>Đóng</button>
              <button type="submit" className="admin-btn admin-btn--primary" disabled={busy}>Ghi nhận</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
