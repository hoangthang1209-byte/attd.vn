"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { OrderStatus } from "@prisma/client";
import DeliveryDetailPanel from "@/components/admin/operations/DeliveryDetailPanel";
import OrderStatusBadge from "@/components/admin/orders/OrderStatusBadge";
import { formatOrderDate } from "@/features/orders/order-format";
import { ORDER_STATUS_LABELS } from "@/features/orders/order-labels";
import {
  deliveryReadinessClass,
  deliveryReadinessLabel,
} from "@/features/orders/order-operations.service";
import type {
  DeliveryBoardOrder,
  DeliveryBoardSummary,
  DeliveryReadiness,
} from "@/features/orders/order-operations.types";
import { useAdminMutation } from "@/hooks/useAdminAction";
import { parseAdminJsonResponse } from "@/lib/admin/adminMutation";

const DELIVERY_STATUSES: OrderStatus[] = ["READY_TO_SHIP", "SHIPPED", "COMPLETED"];

const READINESS_OPTIONS: { value: DeliveryReadiness; label: string }[] = [
  { value: "READY", label: "Sẵn sàng giao" },
  { value: "MISSING_INFO", label: "Thiếu thông tin" },
  { value: "LATE", label: "Giao trễ dự kiến" },
  { value: "IN_TRANSIT", label: "Đang giao" },
  { value: "COMPLETED", label: "Đã hoàn tất" },
];

function truncateAddress(address: string | null, max = 40): string {
  if (!address) return "—";
  if (address.length <= max) return address;
  return `${address.slice(0, max)}…`;
}

export default function DeliveryBoardManager() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mutate = useAdminMutation();

  const [orders, setOrders] = useState<DeliveryBoardOrder[]>([]);
  const [summary, setSummary] = useState<DeliveryBoardSummary | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [panelOrderId, setPanelOrderId] = useState<string | null>(null);

  const filters = useMemo(() => ({
    status: (searchParams.get("status") as OrderStatus | null) ?? "",
    readiness: (searchParams.get("readiness") as DeliveryReadiness | null) ?? "",
    completedToday: searchParams.get("completedToday") === "1",
    includeCompleted: searchParams.get("includeCompleted") === "1",
    search: searchParams.get("search") ?? "",
  }), [searchParams]);

  const [searchInput, setSearchInput] = useState(filters.search);

  useEffect(() => {
    setSearchInput(filters.search);
  }, [filters.search]);

  const applyFilters = useCallback((next: Partial<typeof filters & { completedToday?: boolean; includeCompleted?: boolean }>) => {
    const params = new URLSearchParams(searchParams.toString());
    const merged = { ...filters, ...next };
    if (merged.status) params.set("status", merged.status);
    else params.delete("status");
    if (merged.readiness) params.set("readiness", merged.readiness);
    else params.delete("readiness");
    if (merged.search) params.set("search", merged.search);
    else params.delete("search");
    if (merged.completedToday) params.set("completedToday", "1");
    else params.delete("completedToday");
    if (merged.includeCompleted) params.set("includeCompleted", "1");
    else params.delete("includeCompleted");
    router.replace(`/admin/delivery?${params.toString()}`);
  }, [filters, router, searchParams]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.status && DELIVERY_STATUSES.includes(filters.status as OrderStatus)) {
        params.set("status", filters.status);
      }
      if (filters.readiness) params.set("readiness", filters.readiness);
      if (filters.completedToday) params.set("completedToday", "1");
      if (filters.includeCompleted) params.set("includeCompleted", "1");
      if (filters.search.trim()) params.set("search", filters.search.trim());

      const res = await fetch(`/api/orders/delivery-board?${params}`);
      const data = await res.json() as {
        orders?: DeliveryBoardOrder[];
        total?: number;
        summary?: DeliveryBoardSummary;
        message?: string;
      };
      if (!res.ok) throw new Error(data.message ?? "Không thể tải bảng giao hàng");
      setOrders(data.orders ?? []);
      setTotal(data.total ?? 0);
      setSummary(data.summary ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi tải dữ liệu");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { void load(); }, [load]);

  async function quickStatus(orderId: string, status: OrderStatus) {
    await mutate({
      loadingMessage: "Đang cập nhật trạng thái…",
      successMessage: "Đã cập nhật trạng thái đơn hàng.",
      action: async () => {
        const res = await fetch(`/api/orders/${orderId}/status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
        return parseAdminJsonResponse(res, () => undefined);
      },
      onSuccess: () => void load(),
    });
  }

  const summaryCards = summary ? [
    { label: "Sẵn sàng giao", value: summary.readyToShipCount, filter: { status: "READY_TO_SHIP" as const, readiness: "" } },
    { label: "Đã bàn giao vận chuyển", value: summary.shippedCount, filter: { status: "SHIPPED" as const, readiness: "" } },
    { label: "Giao trễ dự kiến", value: summary.lateCount, filter: { readiness: "LATE" as const, status: "" }, danger: true },
    { label: "Thiếu thông tin giao hàng", value: summary.missingInfoCount, filter: { readiness: "MISSING_INFO" as const, status: "" }, warning: true },
    { label: "Hoàn tất hôm nay", value: summary.completedTodayCount, filter: { completedToday: true, status: "", readiness: "" } },
  ] : [];

  return (
    <div className="admin-panel">
      <div className="admin-section-header">
        <div>
          <h2 className="admin-subtitle">Vận hành giao hàng</h2>
          <p className="admin-muted">Tổng: {total} đơn trong quy trình giao hàng</p>
        </div>
      </div>

      {summary && (
        <div className="admin-dashboard-grid admin-ops-summary-grid">
          {summaryCards.map((card) => (
            <button
              key={card.label}
              type="button"
              className={`admin-dashboard-card admin-dashboard-card--link admin-ops-summary-card${
                card.danger ? " admin-dashboard-card--danger" : card.warning ? " admin-dashboard-card--warning" : ""
              }`}
              onClick={() => applyFilters(card.filter)}
            >
              <p className="admin-dashboard-label">{card.label}</p>
              <p className="admin-dashboard-value">{card.value}</p>
            </button>
          ))}
        </div>
      )}

      <form
        className="admin-crm-filters"
        onSubmit={(e) => {
          e.preventDefault();
          applyFilters({ search: searchInput });
        }}
      >
        <input
          className="admin-input admin-ops-search"
          placeholder="Tìm mã đơn, khách hàng, người nhận…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <select
          className="admin-input"
          value={filters.status}
          onChange={(e) => applyFilters({ status: e.target.value })}
        >
          <option value="">Trạng thái đơn hàng</option>
          <option value="READY_TO_SHIP">{ORDER_STATUS_LABELS.READY_TO_SHIP}</option>
          <option value="SHIPPED">{ORDER_STATUS_LABELS.SHIPPED}</option>
          <option value="COMPLETED">{ORDER_STATUS_LABELS.COMPLETED}</option>
        </select>
        <select
          className="admin-input"
          value={filters.readiness}
          onChange={(e) => applyFilters({ readiness: e.target.value as DeliveryReadiness | "" })}
        >
          <option value="">Tình trạng giao hàng</option>
          {READINESS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <label className="admin-checkbox-label">
          <input
            type="checkbox"
            checked={filters.includeCompleted}
            onChange={(e) => applyFilters({ includeCompleted: e.target.checked })}
          />
          Bao gồm đơn hoàn tất
        </label>
        <button type="submit" className="admin-btn">Tìm kiếm</button>
        {(filters.status || filters.readiness || filters.search || filters.includeCompleted || filters.completedToday) && (
          <button
            type="button"
            className="admin-btn admin-btn--secondary"
            onClick={() => {
              setSearchInput("");
              router.replace("/admin/delivery");
            }}
          >
            Xóa bộ lọc
          </button>
        )}
      </form>

      {error && <p className="admin-error">{error}</p>}

      {loading ? (
        <p className="admin-loading">Đang tải…</p>
      ) : orders.length === 0 ? (
        <div className="admin-empty-state"><p>Không có đơn hàng phù hợp</p></div>
      ) : (
        <div className="admin-table-wrap admin-ops-table-wrap">
          <table className="admin-table admin-ops-table">
            <thead>
              <tr>
                <th>Mã đơn hàng</th>
                <th>Khách hàng</th>
                <th>Người nhận</th>
                <th>Số điện thoại</th>
                <th>Địa chỉ giao hàng</th>
                <th>Hình thức giao hàng</th>
                <th>Đơn vị vận chuyển</th>
                <th>Mã vận đơn</th>
                <th>Dự kiến giao</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td><code>{order.orderNo}</code></td>
                  <td>{order.customerCompanyName ?? "—"}</td>
                  <td>{order.deliveryRecipientName ?? "—"}</td>
                  <td>{order.deliveryRecipientPhone ?? "—"}</td>
                  <td
                    className="admin-ops-address-cell"
                    title={order.deliveryAddress ?? undefined}
                  >
                    {truncateAddress(order.deliveryAddress)}
                  </td>
                  <td>{order.deliveryMethodName ?? "—"}</td>
                  <td>{order.deliveryCarrier ?? "—"}</td>
                  <td>{order.deliveryTrackingCode ?? "—"}</td>
                  <td>
                    {order.deliveryExpectedAt ? formatOrderDate(order.deliveryExpectedAt) : "—"}
                  </td>
                  <td>
                    <div className="admin-ops-status-cell">
                      <OrderStatusBadge status={order.status} />
                      <span className={`ops-urgency-badge ${deliveryReadinessClass(order.deliveryReadiness)}`}>
                        {deliveryReadinessLabel(order.deliveryReadiness)}
                      </span>
                      {order.missingDeliveryFields.length > 0 && (
                        <button
                          type="button"
                          className="ops-warning-badge"
                          onClick={() => setPanelOrderId(order.id)}
                          title={order.missingDeliveryFields.join(", ")}
                        >
                          Thiếu thông tin
                        </button>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="admin-ops-row-actions">
                      <Link href={`/admin/orders/${order.id}`} className="admin-btn admin-btn--secondary admin-btn--small">
                        Xem đơn
                      </Link>
                      <button
                        type="button"
                        className="admin-btn admin-btn--secondary admin-btn--small"
                        onClick={() => setPanelOrderId(order.id)}
                      >
                        Cập nhật giao hàng
                      </button>
                      {order.status === "READY_TO_SHIP" && order.missingDeliveryFields.length === 0 && (
                        <button
                          type="button"
                          className="admin-btn admin-btn--primary admin-btn--small"
                          onClick={() => void quickStatus(order.id, "SHIPPED")}
                        >
                          Đã giao hàng
                        </button>
                      )}
                      {order.status === "SHIPPED" && (
                        <button
                          type="button"
                          className="admin-btn admin-btn--primary admin-btn--small"
                          onClick={() => void quickStatus(order.id, "COMPLETED")}
                        >
                          Hoàn tất
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <DeliveryDetailPanel
        orderId={panelOrderId}
        onClose={() => setPanelOrderId(null)}
        onSaved={() => void load()}
      />
    </div>
  );
}
