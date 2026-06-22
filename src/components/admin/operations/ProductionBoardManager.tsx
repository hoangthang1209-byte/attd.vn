"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { OrderStatus } from "@prisma/client";
import ProductionDetailPanel from "@/components/admin/operations/ProductionDetailPanel";
import OrderStatusBadge from "@/components/admin/orders/OrderStatusBadge";
import ProductionSheetActions from "@/components/admin/orders/production-sheet/ProductionSheetActions";
import type { EmployeeRecord } from "@/features/employees/employee.service";
import { formatOrderDate } from "@/features/orders/order-format";
import { ORDER_STATUS_LABELS } from "@/features/orders/order-labels";
import {
  productionUrgencyClass,
  productionUrgencyLabel,
} from "@/features/orders/order-operations-labels";
import type {
  ProductionBoardOrder,
  ProductionBoardSummary,
  ProductionDueFilter,
} from "@/features/orders/order-operations.types";
import type { ProductionBoardQcFilter } from "@/features/orders/production-execution-labels";
import { PRODUCTION_BOARD_QC_FILTER_LABELS } from "@/features/orders/production-execution-labels";
import { useAdminMutation } from "@/hooks/useAdminAction";
import { parseAdminJsonResponse } from "@/lib/admin/adminMutation";

type CustomerOption = { id: string; name: string };

const PRODUCTION_STATUSES: OrderStatus[] = ["CONFIRMED", "IN_PRODUCTION", "READY_TO_SHIP"];

const DUE_OPTIONS: { value: ProductionDueFilter; label: string }[] = [
  { value: "overdue", label: "Quá hạn" },
  { value: "today", label: "Hôm nay" },
  { value: "upcoming", label: "Sắp trễ hạn" },
  { value: "upcoming3", label: "3 ngày tới" },
  { value: "upcoming7", label: "7 ngày tới" },
  { value: "none", label: "Chưa có hạn" },
];

type ProductionBoardFilters = {
  status: OrderStatus | "";
  ownerId: string;
  due: ProductionDueFilter | "";
  customerId: string;
  salesEmployeeId: string;
  search: string;
  qcFilter: ProductionBoardQcFilter | "";
};

const EMPTY_FILTERS: ProductionBoardFilters = {
  status: "",
  ownerId: "",
  due: "",
  customerId: "",
  salesEmployeeId: "",
  search: "",
  qcFilter: "",
};

/** Summary card targets — each replaces the entire board query string. */
const PRODUCTION_SUMMARY_CARD_PARAMS: Record<string, Partial<ProductionBoardFilters>> = {
  confirmed: { status: "CONFIRMED" },
  inProduction: { status: "IN_PRODUCTION" },
  dueSoon: { due: "upcoming" },
  overdue: { due: "overdue" },
  readyToShip: { status: "READY_TO_SHIP" },
  needsQc: { status: "IN_PRODUCTION", qcFilter: "no_qc" },
  needsRework: { qcFilter: "rework" },
  awaitingPacking: { status: "IN_PRODUCTION", qcFilter: "not_ready" },
  handoverReady: { qcFilter: "ready" },
};

function formatQuantity(order: ProductionBoardOrder): string {
  const unit = order.primaryUnit ? ` ${order.primaryUnit}` : "";
  return `${order.totalQuantity.toLocaleString("vi-VN")}${unit}`;
}

function formatProductSummary(order: ProductionBoardOrder): string {
  if (!order.primaryProductName) return "—";
  if (order.extraProductCount > 0) {
    return `${order.primaryProductName} (+ ${order.extraProductCount} sản phẩm khác)`;
  }
  return order.primaryProductName;
}

export default function ProductionBoardManager() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mutate = useAdminMutation();

  const [orders, setOrders] = useState<ProductionBoardOrder[]>([]);
  const [summary, setSummary] = useState<ProductionBoardSummary | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [panelOrderId, setPanelOrderId] = useState<string | null>(null);

  const [productionEmployees, setProductionEmployees] = useState<EmployeeRecord[]>([]);
  const [salesEmployees, setSalesEmployees] = useState<EmployeeRecord[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);

  const filters = useMemo(() => ({
    status: (searchParams.get("status") as OrderStatus | null) ?? "",
    ownerId: searchParams.get("ownerId") ?? "",
    due: (searchParams.get("due") as ProductionDueFilter | null) ?? "",
    customerId: searchParams.get("customerId") ?? "",
    salesEmployeeId: searchParams.get("salesEmployeeId") ?? "",
    search: searchParams.get("search") ?? "",
    qcFilter: (searchParams.get("qcFilter") as ProductionBoardQcFilter | null) ?? "",
  }), [searchParams]);

  const [searchInput, setSearchInput] = useState(filters.search);

  useEffect(() => {
    setSearchInput(filters.search);
  }, [filters.search]);

  const applyFilters = useCallback((next: Partial<ProductionBoardFilters>) => {
    const params = new URLSearchParams(searchParams.toString());
    const merged = { ...filters, ...next };
    for (const [key, value] of Object.entries(merged)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    router.replace(`/admin/production?${params.toString()}`, { scroll: false });
  }, [filters, router, searchParams]);

  const applyCardFilter = useCallback((cardKey: keyof typeof PRODUCTION_SUMMARY_CARD_PARAMS) => {
    const cardParams = PRODUCTION_SUMMARY_CARD_PARAMS[cardKey];
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries({ ...EMPTY_FILTERS, ...cardParams })) {
      if (value) params.set(key, value);
    }
    router.replace(
      params.toString() ? `/admin/production?${params.toString()}` : "/admin/production",
      { scroll: false },
    );
  }, [router]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.status && PRODUCTION_STATUSES.includes(filters.status as OrderStatus)) {
        params.set("status", filters.status);
      }
      if (filters.ownerId) params.set("ownerId", filters.ownerId);
      if (filters.due) params.set("due", filters.due);
      if (filters.customerId) params.set("customerId", filters.customerId);
      if (filters.salesEmployeeId) params.set("salesEmployeeId", filters.salesEmployeeId);
      if (filters.search.trim()) params.set("search", filters.search.trim());
      if (filters.qcFilter) params.set("qcFilter", filters.qcFilter);

      const res = await fetch(`/api/orders/production-board?${params}`);
      const data = await res.json() as {
        orders?: ProductionBoardOrder[];
        total?: number;
        summary?: ProductionBoardSummary;
        message?: string;
      };
      if (!res.ok) throw new Error(data.message ?? "Không thể tải bảng sản xuất");
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

  useEffect(() => {
    void Promise.all([
      fetch("/api/employees?active=1&role=PRODUCTION&limit=200").then((r) => r.json()),
      fetch("/api/employees?active=1&role=SALES&limit=200").then((r) => r.json()),
      fetch("/api/crm/customers").then((r) => r.json()),
    ]).then(([prodData, salesData, custData]) => {
      setProductionEmployees((prodData as { employees?: EmployeeRecord[] }).employees ?? []);
      setSalesEmployees((salesData as { employees?: EmployeeRecord[] }).employees ?? []);
      const raw = (custData as { customers?: { id: string; name: string }[] }).customers ?? [];
      setCustomers(raw.map((c) => ({ id: c.id, name: c.name })));
    });
  }, []);

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
    { key: "confirmed" as const, label: "Đơn cần sản xuất", value: summary.confirmedCount },
    { key: "inProduction" as const, label: "Đang sản xuất", value: summary.inProductionCount },
    { key: "needsQc" as const, label: "Cần QC", value: summary.needsQcCount },
    { key: "needsRework" as const, label: "Cần làm lại", value: summary.needsReworkCount },
    { key: "awaitingPacking" as const, label: "Chờ đóng gói", value: summary.awaitingPackingCount },
    { key: "handoverReady" as const, label: "Đủ bàn giao", value: summary.handoverReadyCount },
    { key: "dueSoon" as const, label: "Sắp trễ hạn", value: summary.dueSoonCount },
    { key: "overdue" as const, label: "Quá hạn", value: summary.overdueCount, danger: true },
    { key: "readyToShip" as const, label: "Sẵn sàng giao", value: summary.readyToShipCount },
  ] : [];

  return (
    <div className="admin-panel">
      <div className="admin-section-header">
        <div>
          <h2 className="admin-subtitle">Bảng sản xuất</h2>
          <p className="admin-muted">Tổng: {total} đơn đang trong quy trình sản xuất</p>
        </div>
      </div>

      {summary && (
        <div className="admin-dashboard-grid admin-ops-summary-grid">
          {summaryCards.map((card) => (
            <button
              key={card.key}
              type="button"
              className={`admin-dashboard-card admin-dashboard-card--link admin-ops-summary-card${card.danger ? " admin-dashboard-card--danger" : ""}`}
              onClick={() => applyCardFilter(card.key)}
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
          placeholder="Tìm DH, BG, khách hàng, sản phẩm, SKU…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <select
          className="admin-input"
          value={filters.status}
          onChange={(e) =>
            applyFilters({
              status: (e.target.value || "") as ProductionBoardFilters["status"],
            })
          }
        >
          <option value="">Trạng thái đơn hàng</option>
          {PRODUCTION_STATUSES.map((s) => (
            <option key={s} value={s}>{ORDER_STATUS_LABELS[s]}</option>
          ))}
        </select>
        <select
          className="admin-input"
          value={filters.ownerId}
          onChange={(e) => applyFilters({ ownerId: e.target.value })}
        >
          <option value="">Người phụ trách sản xuất</option>
          {productionEmployees.map((e) => (
            <option key={e.id} value={e.id}>{e.fullName}</option>
          ))}
        </select>
        <select
          className="admin-input"
          value={filters.due}
          onChange={(e) => applyFilters({ due: e.target.value as ProductionDueFilter | "" })}
        >
          <option value="">Hạn hoàn thành</option>
          {DUE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          className="admin-input"
          value={filters.customerId}
          onChange={(e) => applyFilters({ customerId: e.target.value })}
        >
          <option value="">Khách hàng</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select
          className="admin-input"
          value={filters.salesEmployeeId}
          onChange={(e) => applyFilters({ salesEmployeeId: e.target.value })}
        >
          <option value="">Nhân viên tư vấn</option>
          {salesEmployees.map((e) => (
            <option key={e.id} value={e.id}>{e.fullName}</option>
          ))}
        </select>
        <select
          className="admin-input"
          value={filters.qcFilter}
          onChange={(e) => applyFilters({ qcFilter: e.target.value as ProductionBoardQcFilter | "" })}
        >
          <option value="">QC / Bàn giao</option>
          {(Object.keys(PRODUCTION_BOARD_QC_FILTER_LABELS) as ProductionBoardQcFilter[]).map((k) => (
            <option key={k} value={k}>{PRODUCTION_BOARD_QC_FILTER_LABELS[k]}</option>
          ))}
        </select>
        <button type="submit" className="admin-btn">Tìm kiếm</button>
        {(filters.status || filters.ownerId || filters.due || filters.customerId || filters.salesEmployeeId || filters.search || filters.qcFilter) && (
          <button
            type="button"
            className="admin-btn admin-btn--secondary"
            onClick={() => {
              setSearchInput("");
              router.replace("/admin/production", { scroll: false });
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
                <th>Sản phẩm chính</th>
                <th>Tổng số lượng</th>
                <th>Người phụ trách</th>
                <th>Hạn hoàn thành</th>
                <th>Trạng thái</th>
                <th>Tiến độ</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td><code>{order.orderNo}</code></td>
                  <td>{order.customerCompanyName ?? order.contactName ?? "—"}</td>
                  <td className="admin-ops-product-cell">{formatProductSummary(order)}</td>
                  <td>{formatQuantity(order)}</td>
                  <td>{order.productionOwnerName ?? "—"}</td>
                  <td>
                    <span className={`ops-due-date ${productionUrgencyClass(order.productionUrgency)}`}>
                      {order.productionDueDate ? formatOrderDate(order.productionDueDate) : "—"}
                    </span>
                  </td>
                  <td><OrderStatusBadge status={order.status} /></td>
                  <td>
                    <div
                      className="admin-ops-exec-badges"
                      title={`Công đoạn: ${order.executionStageProgress} · QC: ${order.executionQcStatusLabel} · Đóng gói: ${order.executionPackingLabel} · Bàn giao: ${order.executionHandoverLabel}`}
                    >
                      <span className="ops-exec-badge">{order.executionStageProgress}</span>
                      <span className="ops-exec-badge">{order.executionQcStatusLabel}</span>
                      <span className="ops-exec-badge">{order.executionPackingLabel}</span>
                    </div>
                    <span className={`ops-urgency-badge ${productionUrgencyClass(order.productionUrgency)}`} style={{ marginTop: 4, display: "inline-block" }}>
                      {productionUrgencyLabel(order.productionUrgency)}
                    </span>
                  </td>
                  <td>
                    <div className="admin-ops-row-actions">
                      <button
                        type="button"
                        className="admin-btn admin-btn--secondary admin-btn--small"
                        onClick={() => setPanelOrderId(order.id)}
                      >
                        Chi tiết
                      </button>
                      <Link href={`/admin/orders/${order.id}`} className="admin-btn admin-btn--secondary admin-btn--small">
                        Xem đơn
                      </Link>
                      <ProductionSheetActions order={order} compact />
                      {order.status === "CONFIRMED" && (
                        <button
                          type="button"
                          className="admin-btn admin-btn--primary admin-btn--small"
                          onClick={() => void quickStatus(order.id, "IN_PRODUCTION")}
                        >
                          Bắt đầu sản xuất
                        </button>
                      )}
                      {order.status === "IN_PRODUCTION" && (
                        <button
                          type="button"
                          className="admin-btn admin-btn--primary admin-btn--small"
                          onClick={() => void quickStatus(order.id, "READY_TO_SHIP")}
                        >
                          Sẵn sàng giao
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

      <ProductionDetailPanel
        orderId={panelOrderId}
        onClose={() => setPanelOrderId(null)}
        onSaved={() => void load()}
      />
    </div>
  );
}
