"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { OrderStatus } from "@prisma/client";
import AdminOpsSidePanel from "@/components/admin/operations/AdminOpsSidePanel";
import OrderStatusBadge from "@/components/admin/orders/OrderStatusBadge";
import type { DeliveryMethodRecord } from "@/features/delivery/delivery-method.service";
import type { EmployeeRecord } from "@/features/employees/employee.service";
import { formatOrderDateTime } from "@/features/orders/order-format";
import {
  deliveryReadinessClass,
  deliveryReadinessLabel,
  getDeliveryReadiness,
  getMissingDeliveryFields,
} from "@/features/orders/order-operations.service";
import { validateDeliveryForShipped } from "@/features/orders/order-status";
import type { OrderDetailRecord } from "@/features/orders/order.types";
import { toDateInputValue } from "@/features/quotes/format";
import { useAdminMutation } from "@/hooks/useAdminAction";
import { parseAdminJsonResponse } from "@/lib/admin/adminMutation";

type Props = {
  orderId: string | null;
  onClose: () => void;
  onSaved: () => void;
};

function syncFields(order: OrderDetailRecord) {
  return {
    deliveryMethodId: order.deliveryMethodId ?? "",
    deliveryOwnerId: order.deliveryOwnerId ?? "",
    deliveryCarrier: order.deliveryCarrier ?? "",
    deliveryTrackingCode: order.deliveryTrackingCode ?? "",
    deliveryRecipientName: order.deliveryRecipientName ?? order.contactName ?? "",
    deliveryRecipientPhone: order.deliveryRecipientPhone ?? order.contactPhone ?? "",
    deliveryAddress: order.deliveryAddress ?? order.customerAddress ?? "",
    deliveryExpectedAt: order.deliveryExpectedAt ? toDateInputValue(order.deliveryExpectedAt) : "",
    deliveryNote: order.deliveryNote ?? "",
  };
}

function deliveryMethodDisplay(order: OrderDetailRecord): string {
  return order.deliveryMethodName ?? order.deliveryMethod ?? "—";
}

export default function DeliveryDetailPanel({ orderId, onClose, onSaved }: Props) {
  const mutate = useAdminMutation();
  const open = Boolean(orderId);
  const [order, setOrder] = useState<OrderDetailRecord | null>(null);
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [deliveryMethods, setDeliveryMethods] = useState<DeliveryMethodRecord[]>([]);
  const [fields, setFields] = useState({
    deliveryMethodId: "",
    deliveryOwnerId: "",
    deliveryCarrier: "",
    deliveryTrackingCode: "",
    deliveryRecipientName: "",
    deliveryRecipientPhone: "",
    deliveryAddress: "",
    deliveryExpectedAt: "",
    deliveryNote: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([
      fetch("/api/employees?active=1&role=DELIVERY&limit=200").then((r) => r.json()),
      fetch("/api/delivery-methods?active=1").then((r) => r.json()),
    ]).then(([empData, dmData]) => {
      setEmployees((empData as { employees?: EmployeeRecord[] }).employees ?? []);
      setDeliveryMethods((dmData as { deliveryMethods?: DeliveryMethodRecord[] }).deliveryMethods ?? []);
    });
  }, []);

  useEffect(() => {
    if (!orderId) {
      setOrder(null);
      return;
    }
    setLoading(true);
    setError(null);
    void fetch(`/api/orders/${orderId}`)
      .then(async (res) => {
        const data = (await res.json()) as { order?: OrderDetailRecord; message?: string };
        if (!res.ok) throw new Error(data.message ?? "Không tải được đơn hàng");
        const detail = data.order ?? null;
        if (!detail) throw new Error("Không tải được đơn hàng");
        setOrder(detail);
        setFields(syncFields(detail));
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [orderId]);

  async function saveDelivery() {
    if (!orderId) return;
    await mutate({
      loadingMessage: "Đang lưu thông tin giao hàng…",
      successMessage: "Đã cập nhật thông tin giao hàng.",
      action: async () => {
        const res = await fetch(`/api/orders/${orderId}/delivery`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            deliveryMethodId: fields.deliveryMethodId || null,
            deliveryOwnerId: fields.deliveryOwnerId || null,
            deliveryCarrier: fields.deliveryCarrier || null,
            deliveryTrackingCode: fields.deliveryTrackingCode || null,
            deliveryRecipientName: fields.deliveryRecipientName || null,
            deliveryRecipientPhone: fields.deliveryRecipientPhone || null,
            deliveryAddress: fields.deliveryAddress || null,
            deliveryExpectedAt: fields.deliveryExpectedAt
              ? new Date(fields.deliveryExpectedAt).toISOString()
              : null,
            deliveryNote: fields.deliveryNote || null,
          }),
        });
        return parseAdminJsonResponse(res, (data) => data.order as OrderDetailRecord);
      },
      onSuccess: (updated) => {
        setOrder(updated);
        setFields(syncFields(updated));
        onSaved();
      },
    });
  }

  async function quickStatus(status: OrderStatus) {
    if (!orderId || !order) return;
    if (status === "SHIPPED") {
      const validationError = validateDeliveryForShipped({
        deliveryRecipientName: fields.deliveryRecipientName,
        deliveryRecipientPhone: fields.deliveryRecipientPhone,
        deliveryAddress: fields.deliveryAddress,
        deliveryMethodId: fields.deliveryMethodId || order.deliveryMethodId,
        deliveryMethodName: order.deliveryMethodName,
        deliveryMethod: order.deliveryMethod,
      });
      if (validationError) {
        setError(validationError);
        return;
      }
    }
    await mutate({
      loadingMessage: "Đang cập nhật trạng thái…",
      successMessage: "Đã cập nhật trạng thái đơn hàng.",
      action: async () => {
        const res = await fetch(`/api/orders/${orderId}/status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
        return parseAdminJsonResponse(res, (data) => data.order as OrderDetailRecord);
      },
      onSuccess: (updated) => {
        setOrder(updated);
        setFields(syncFields(updated));
        setError(null);
        onSaved();
      },
    });
  }

  const deliveryInfo = order
    ? {
        status: order.status,
        deliveryRecipientName: order.deliveryRecipientName,
        deliveryRecipientPhone: order.deliveryRecipientPhone,
        deliveryAddress: order.deliveryAddress,
        deliveryMethodId: order.deliveryMethodId,
        deliveryMethodName: order.deliveryMethodName,
        deliveryMethod: order.deliveryMethod,
        deliveryExpectedAt: order.deliveryExpectedAt ? new Date(order.deliveryExpectedAt) : null,
        deliveredAt: order.deliveredAt ? new Date(order.deliveredAt) : null,
      }
    : null;
  const readiness = deliveryInfo ? getDeliveryReadiness(deliveryInfo) : null;
  const missingFields = deliveryInfo ? getMissingDeliveryFields(deliveryInfo) : [];

  return (
    <AdminOpsSidePanel
      open={open}
      title={order ? `Giao hàng · ${order.orderNo}` : "Chi tiết giao hàng"}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="admin-btn admin-btn--secondary" onClick={onClose}>
            Đóng
          </button>
          <button type="button" className="admin-btn admin-btn--primary" onClick={() => void saveDelivery()} disabled={loading}>
            Lưu giao hàng
          </button>
        </>
      }
    >
      {loading && <p className="admin-loading">Đang tải…</p>}
      {error && <p className="admin-error">{error}</p>}
      {order && readiness && (
        <>
          <dl className="admin-dl">
            <div><dt>Mã đơn</dt><dd>{order.orderNo}</dd></div>
            <div><dt>Khách hàng</dt><dd>{order.customerCompanyName ?? "—"}</dd></div>
            <div><dt>Trạng thái</dt><dd><OrderStatusBadge status={order.status} /></dd></div>
            <div>
              <dt>Tình trạng</dt>
              <dd>
                <span className={`ops-urgency-badge ${deliveryReadinessClass(readiness)}`}>
                  {deliveryReadinessLabel(readiness)}
                </span>
              </dd>
            </div>
            {missingFields.length > 0 && (
              <div>
                <dt>Thiếu</dt>
                <dd className="ops-missing-fields">{missingFields.join(", ")}</dd>
              </div>
            )}
            <div>
              <dt>Bàn giao VC</dt>
              <dd>{order.shippedAt ? formatOrderDateTime(order.shippedAt) : "—"}</dd>
            </div>
            <div>
              <dt>Đã giao</dt>
              <dd>{order.deliveredAt ? formatOrderDateTime(order.deliveredAt) : "—"}</dd>
            </div>
          </dl>

          <div className="admin-field">
            <label className="admin-label">Hình thức giao hàng</label>
            <select
              className="admin-input"
              value={fields.deliveryMethodId}
              onChange={(e) => setFields((p) => ({ ...p, deliveryMethodId: e.target.value }))}
            >
              <option value="">— Chọn hình thức —</option>
              {deliveryMethods.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
              {order.deliveryMethodId &&
                !deliveryMethods.some((m) => m.id === order.deliveryMethodId) &&
                deliveryMethodDisplay(order) !== "—" && (
                  <option value={order.deliveryMethodId}>
                    {deliveryMethodDisplay(order)} (lưu trước)
                  </option>
                )}
            </select>
          </div>
          <div className="admin-field">
            <label className="admin-label">Người phụ trách giao hàng</label>
            <select
              className="admin-input"
              value={fields.deliveryOwnerId}
              onChange={(e) => setFields((p) => ({ ...p, deliveryOwnerId: e.target.value }))}
            >
              <option value="">— Chọn nhân viên —</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.fullName}</option>
              ))}
            </select>
          </div>
          <div className="admin-field">
            <label className="admin-label">Đơn vị vận chuyển</label>
            <input
              className="admin-input"
              value={fields.deliveryCarrier}
              onChange={(e) => setFields((p) => ({ ...p, deliveryCarrier: e.target.value }))}
            />
          </div>
          <div className="admin-field">
            <label className="admin-label">Mã vận đơn</label>
            <input
              className="admin-input"
              value={fields.deliveryTrackingCode}
              onChange={(e) => setFields((p) => ({ ...p, deliveryTrackingCode: e.target.value }))}
            />
          </div>
          <div className="admin-field">
            <label className="admin-label">Người nhận</label>
            <input
              className="admin-input"
              value={fields.deliveryRecipientName}
              onChange={(e) => setFields((p) => ({ ...p, deliveryRecipientName: e.target.value }))}
            />
          </div>
          <div className="admin-field">
            <label className="admin-label">Số điện thoại người nhận</label>
            <input
              className="admin-input"
              value={fields.deliveryRecipientPhone}
              onChange={(e) => setFields((p) => ({ ...p, deliveryRecipientPhone: e.target.value }))}
            />
          </div>
          <div className="admin-field">
            <label className="admin-label">Địa chỉ giao hàng</label>
            <textarea
              className="admin-textarea"
              rows={3}
              value={fields.deliveryAddress}
              onChange={(e) => setFields((p) => ({ ...p, deliveryAddress: e.target.value }))}
            />
          </div>
          <div className="admin-field">
            <label className="admin-label">Dự kiến giao</label>
            <input
              className="admin-input"
              type="date"
              value={fields.deliveryExpectedAt}
              onChange={(e) => setFields((p) => ({ ...p, deliveryExpectedAt: e.target.value }))}
            />
          </div>
          <div className="admin-field">
            <label className="admin-label">Ghi chú giao hàng</label>
            <textarea
              className="admin-textarea"
              rows={2}
              value={fields.deliveryNote}
              onChange={(e) => setFields((p) => ({ ...p, deliveryNote: e.target.value }))}
            />
          </div>

          <div className="admin-ops-panel-actions">
            {order.status === "READY_TO_SHIP" && (
              <button
                type="button"
                className="admin-btn admin-btn--secondary admin-btn--small"
                onClick={() => void quickStatus("SHIPPED")}
              >
                Đã giao hàng
              </button>
            )}
            {order.status === "SHIPPED" && (
              <button
                type="button"
                className="admin-btn admin-btn--secondary admin-btn--small"
                onClick={() => void quickStatus("COMPLETED")}
              >
                Hoàn tất
              </button>
            )}
            <Link href={`/admin/orders/${order.id}`} className="admin-btn admin-btn--secondary admin-btn--small">
              Xem đơn đầy đủ
            </Link>
          </div>
        </>
      )}
    </AdminOpsSidePanel>
  );
}
