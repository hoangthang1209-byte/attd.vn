"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { OrderStatus } from "@prisma/client";
import AdminOpsSidePanel from "@/components/admin/operations/AdminOpsSidePanel";
import OrderStatusBadge from "@/components/admin/orders/OrderStatusBadge";
import ProductionOwnerSelect from "@/components/admin/orders/ProductionOwnerSelect";
import ProductionSheetActions from "@/components/admin/orders/production-sheet/ProductionSheetActions";
import { formatOrderDateTime } from "@/features/orders/order-format";
import type { EmployeeRecord } from "@/features/employees/employee.service";
import { getProductionUrgency } from "@/features/orders/order-operations-helpers";
import {
  productionUrgencyClass,
  productionUrgencyLabel,
} from "@/features/orders/order-operations-labels";
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
    productionOwnerId: order.productionOwnerId ?? "",
    productionDueDate: order.productionDueDate ? toDateInputValue(order.productionDueDate) : "",
    productionNote: order.productionNote ?? "",
  };
}

export default function ProductionDetailPanel({ orderId, onClose, onSaved }: Props) {
  const mutate = useAdminMutation();
  const open = Boolean(orderId);
  const [order, setOrder] = useState<OrderDetailRecord | null>(null);
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [fields, setFields] = useState({ productionOwnerId: "", productionDueDate: "", productionNote: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/employees?active=1&role=PRODUCTION&limit=200")
      .then((r) => r.json())
      .then((data: { employees?: EmployeeRecord[] }) => setEmployees(data.employees ?? []));
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

  async function saveProduction(override?: Partial<typeof fields>) {
    if (!orderId) return;
    const payload = { ...fields, ...override };
    await mutate({
      loadingMessage: "Đang lưu thông tin sản xuất…",
      successMessage: "Đã cập nhật thông tin sản xuất.",
      action: async () => {
        const res = await fetch(`/api/orders/${orderId}/production`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productionOwnerId: payload.productionOwnerId || null,
            productionDueDate: payload.productionDueDate || null,
            productionNote: payload.productionNote || null,
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
    if (!orderId) return;
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
        onSaved();
      },
    });
  }

  return (
    <AdminOpsSidePanel
      open={open}
      title={order ? `Sản xuất · ${order.orderNo}` : "Chi tiết sản xuất"}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="admin-btn admin-btn--secondary" onClick={onClose}>
            Đóng
          </button>
          <button type="button" className="admin-btn admin-btn--primary" onClick={() => void saveProduction()} disabled={loading}>
            Lưu sản xuất
          </button>
        </>
      }
    >
      {loading && <p className="admin-loading">Đang tải…</p>}
      {error && <p className="admin-error">{error}</p>}
      {order && (() => {
        const urgency = getProductionUrgency(
          order.productionDueDate ? new Date(order.productionDueDate) : null,
        );
        const variantRows = order.items.flatMap((item) =>
          item.variants.length > 0
            ? item.variants.map((v) => ({
                productName: item.productNameSnapshot,
                colorName: v.colorNameSnapshot,
                sizeValue: v.sizeValue,
                quantity: v.quantity,
                unit: v.unit,
                sku: v.skuSnapshot,
              }))
            : [{
                productName: item.productNameSnapshot,
                colorName: item.colorSnapshot,
                sizeValue: item.variantNameSnapshot,
                quantity: item.quantity,
                unit: item.unit,
                sku: item.skuSnapshot,
              }],
        );
        return (
        <>
          <dl className="admin-dl">
            <div><dt>Mã đơn</dt><dd>{order.orderNo}</dd></div>
            <div><dt>Khách hàng</dt><dd>{order.customerCompanyName ?? "—"}</dd></div>
            <div><dt>Trạng thái</dt><dd><OrderStatusBadge status={order.status} /></dd></div>
            <div>
              <dt>Tiến độ</dt>
              <dd>
                <span className={`ops-urgency-badge ${productionUrgencyClass(urgency)}`}>
                  {productionUrgencyLabel(urgency)}
                </span>
              </dd>
            </div>
            <div>
              <dt>Bắt đầu SX</dt>
              <dd>{order.productionStartedAt ? formatOrderDateTime(order.productionStartedAt) : "—"}</dd>
            </div>
            <div>
              <dt>Giao hàng</dt>
              <dd>{order.deliveryMethodName ?? order.deliveryMethod ?? "—"}</dd>
            </div>
          </dl>

          <div className="admin-field">
            <label className="admin-label">Người phụ trách sản xuất</label>
            <ProductionOwnerSelect
              value={fields.productionOwnerId}
              onChange={(productionOwnerId) => setFields((p) => ({ ...p, productionOwnerId }))}
              employees={employees}
              onEmployeesChange={setEmployees}
              legacyOwnerName={
                !order.productionOwnerId && order.productionOwnerName
                  ? order.productionOwnerName
                  : null
              }
              onEmployeeCreated={(employee) => {
                void saveProduction({ productionOwnerId: employee.id });
              }}
            />
          </div>
          <div className="admin-field">
            <label className="admin-label">Hạn hoàn thành</label>
            <input
              className="admin-input"
              type="date"
              value={fields.productionDueDate}
              onChange={(e) => setFields((p) => ({ ...p, productionDueDate: e.target.value }))}
            />
          </div>
          <div className="admin-field">
            <label className="admin-label">Ghi chú sản xuất</label>
            <textarea
              className="admin-textarea"
              rows={3}
              value={fields.productionNote}
              onChange={(e) => setFields((p) => ({ ...p, productionNote: e.target.value }))}
            />
          </div>

          {variantRows.length > 0 && (
            <div className="admin-ops-variant-block">
              <h3 className="admin-ops-variant-block__title">Biến thể sản phẩm</h3>
              <div className="admin-table-wrap">
                <table className="admin-table admin-table--compact">
                  <thead>
                    <tr>
                      <th>Sản phẩm</th>
                      <th>Màu</th>
                      <th>Size</th>
                      <th>SL</th>
                      <th>SKU</th>
                    </tr>
                  </thead>
                  <tbody>
                    {variantRows.map((v, i) => (
                      <tr key={`${v.sku ?? i}`}>
                        <td>{v.productName ?? "—"}</td>
                        <td>{v.colorName ?? "—"}</td>
                        <td>{v.sizeValue ?? "—"}</td>
                        <td>{v.quantity} {v.unit}</td>
                        <td>{v.sku ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="admin-ops-panel-actions">
            <ProductionSheetActions order={order} />
            {order.status === "CONFIRMED" && (
              <button type="button" className="admin-btn admin-btn--secondary admin-btn--small" onClick={() => void quickStatus("IN_PRODUCTION")}>
                Bắt đầu sản xuất
              </button>
            )}
            {order.status === "IN_PRODUCTION" && (
              <button type="button" className="admin-btn admin-btn--secondary admin-btn--small" onClick={() => void quickStatus("READY_TO_SHIP")}>
                Sẵn sàng giao
              </button>
            )}
            <Link href={`/admin/orders/${order.id}`} className="admin-btn admin-btn--secondary admin-btn--small">
              Xem đơn đầy đủ
            </Link>
          </div>
        </>
        );
      })()}
    </AdminOpsSidePanel>
  );
}
