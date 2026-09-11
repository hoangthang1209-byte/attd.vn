"use client";

import { useState } from "react";
import {
  formatOrderCurrency,
  formatOrderDateTime,
} from "@/features/orders/order-format";
import {
  ORDER_PAYMENT_METHOD_LABELS,
  ORDER_PAYMENT_STATE_LABELS,
  ORDER_PAYMENT_STATUS_LABELS,
  ORDER_PAYMENT_TYPE_LABELS,
} from "@/features/orders/order-labels";
import type { OrderDetailRecord } from "@/features/orders/order.types";

type Props = {
  order: OrderDetailRecord;
  canRecordPayment: boolean;
  busy: boolean;
  onOpenRecordPayment: () => void;
  onOpenEditPayment: (paymentId: string) => void;
  onOpenVoidPayment: (paymentId: string) => void;
};

export default function OrderWorkspacePaymentTab({
  order,
  canRecordPayment,
  busy,
  onOpenRecordPayment,
  onOpenEditPayment,
  onOpenVoidPayment,
}: Props) {
  const financials = order.financials;
  const transferContent = `ATTD ${order.orderNo.replace(/-/g, "")}`;
  const [copied, setCopied] = useState(false);

  async function copyTransferContent() {
    try {
      await navigator.clipboard.writeText(transferContent);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="order-workspace-payment-tab">
      {financials && (
        <div className="order-workspace-payment-summary">
          <div className="order-workspace-payment-kpi">
            <strong>{formatOrderCurrency(financials.totalAmount, order.currency)}</strong>
            <span>Tổng thanh toán</span>
          </div>
          <div className="order-workspace-payment-kpi">
            <strong>{formatOrderCurrency(order.vatAmount, order.currency)}</strong>
            <span>VAT</span>
          </div>
          <div className="order-workspace-payment-kpi">
            <strong>{formatOrderCurrency(financials.paidAmount, order.currency)}</strong>
            <span>Đã nhận</span>
          </div>
          <div className="order-workspace-payment-kpi">
            <strong>{formatOrderCurrency(financials.outstandingAmount, order.currency)}</strong>
            <span>Còn phải thu</span>
          </div>
          <div className="order-workspace-payment-kpi">
            <strong>{ORDER_PAYMENT_STATE_LABELS[financials.paymentState]}</strong>
            <span>Trạng thái</span>
          </div>
        </div>
      )}

      {order.currency === "VND" && (
        <div
          style={{
            marginTop: 12,
            marginBottom: 12,
            padding: 14,
            border: "1px solid var(--admin-border, #e2e8f0)",
            borderRadius: 10,
            background: "var(--admin-surface-muted, #f8fafc)",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Nội dung chuyển khoản tự động</div>
          <div className="admin-field-hint" style={{ marginBottom: 10 }}>
            Gửi đúng nội dung này cho khách để SePay tự khớp giao dịch vào đơn hàng.
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <code
              style={{
                padding: "8px 10px",
                borderRadius: 8,
                background: "#fff",
                border: "1px solid #e2e8f0",
                fontWeight: 700,
                letterSpacing: "0.02em",
              }}
            >
              {transferContent}
            </code>
            <button
              type="button"
              className="admin-btn admin-btn--secondary admin-btn--small"
              onClick={() => void copyTransferContent()}
            >
              {copied ? "Đã copy" : "Copy nội dung"}
            </button>
          </div>
          {financials && financials.outstandingAmount > 0 && (
            <div className="admin-field-hint" style={{ marginTop: 8 }}>
              Công nợ hiện tại: {formatOrderCurrency(financials.outstandingAmount, order.currency)}. Hệ thống chỉ tự ghi nhận khi số tiền chuyển không vượt công nợ còn lại.
            </div>
          )}
        </div>
      )}

      {canRecordPayment && (
        <button
          type="button"
          className="admin-btn admin-btn--primary admin-btn--small"
          onClick={onOpenRecordPayment}
        >
          Ghi nhận thanh toán
        </button>
      )}

      <div className="admin-table-wrap" style={{ marginTop: 12 }}>
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
            {(order.payments ?? []).length === 0 ? (
              <tr><td colSpan={8}>Chưa có ghi nhận thanh toán</td></tr>
            ) : (order.payments ?? []).map((p) => (
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
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className="admin-btn admin-btn--secondary admin-btn--xs"
                        disabled={busy}
                        onClick={() => onOpenEditPayment(p.id)}
                      >
                        Chỉnh sửa
                      </button>
                      <button
                        type="button"
                        className="admin-btn admin-btn--secondary admin-btn--xs"
                        disabled={busy}
                        onClick={() => onOpenVoidPayment(p.id)}
                      >
                        Hủy ghi nhận
                      </button>
                    </div>
                  ) : p.status === "VOID" ? (
                    <span className="admin-field-hint">Đã hủy</span>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
