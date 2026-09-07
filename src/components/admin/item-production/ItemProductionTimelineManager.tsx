"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AdminLoadingState,
  DataToolbar,
  EmptyState,
  StatusBadge,
  WorkspaceToolbarEnd,
} from "@/components/admin/AdminUi";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import { ITEM_PRODUCTION_RISK_CONFIG, ITEM_PRODUCTION_STAGE_SHORT_LABELS } from "@/features/item-production-tracking/config";
import {
  ITEM_PRODUCTION_RISK_LABELS,
  ITEM_PRODUCTION_SAMPLE_STATUS_LABELS,
  ITEM_PRODUCTION_STATUS_LABELS,
} from "@/features/item-production-tracking/labels";
import type {
  ItemProductionIssueType,
  ItemProductionRiskStatus,
  ItemProductionSampleStatus,
  ItemProductionStageKey,
  ItemProductionStatus,
} from "@prisma/client";
import ItemProductionStageDrawer from "@/components/admin/item-production/ItemProductionStageDrawer";
import ItemProductionDetailDrawer from "@/components/admin/item-production/ItemProductionDetailDrawer";
import ItemProductionBatchPanel from "@/components/admin/item-production/ItemProductionBatchPanel";
import ItemProductionQuickUpdateModal from "@/components/admin/item-production/ItemProductionQuickUpdateModal";
import ItemProductionIssueModal from "@/components/admin/item-production/ItemProductionIssueModal";
import ItemProductionResolveIssueModal from "@/components/admin/item-production/ItemProductionResolveIssueModal";
import ItemProductionOrderHeader from "@/components/admin/item-production/ItemProductionOrderHeader";
import ItemProductionNextActionCell from "@/components/admin/item-production/ItemProductionNextActionCell";
import { isNextActionOverdue } from "@/features/item-production-tracking/progress-risk";

type StageCell = {
  id: string;
  stageKey: ItemProductionStageKey;
  labelSnapshot: string;
  sequence: number;
  isApplicable: boolean;
  status: string;
  plannedQuantity: number;
  completedQuantity: number;
  rejectedQuantity: number;
  reworkQuantity: number;
};

type ListItem = {
  id: string;
  orderedQuantity: number;
  plannedQuantity: number;
  readyQuantity: number;
  progressPercent: number | string;
  productionStatus: ItemProductionStatus;
  riskStatus: ItemProductionRiskStatus;
  currentStageKey: ItemProductionStageKey | null;
  promisedDeliveryDate: string | null;
  lastProgressAt: string | null;
  rowVersion: number;
  productionApprovalStatus?: "PENDING" | "NEEDS_REVISION" | "RELEASED";
  productionApprovalArtworkStale?: boolean;
  supplier: { id: string; name: string; code: string } | null;
  assignedEmployee: { id: string; fullName: string; employeeCode: string } | null;
  stages: StageCell[];
  orderItem: {
    id: string;
    productNameSnapshot: string | null;
    variantNameSnapshot: string | null;
    colorSnapshot: string | null;
    skuSnapshot: string | null;
    designImageUrl: string | null;
    designMediaAsset: { url: string | null; thumbnailUrl: string | null } | null;
    order: {
      id: string;
      orderNo: string;
      customerNameSnapshot: string | null;
      customerCompanyName: string | null;
      customer: { name: string; code: string | null } | null;
    };
  };
  batchSummary?: {
    hasBatches: boolean;
    batchCount: number;
    allocatedQuantity: number;
    unallocatedQuantity: number;
    supplierCount: number;
    usesBatchExecution: boolean;
  };
  sampleStatus?: ItemProductionSampleStatus;
  nextAction?: string | null;
  nextActionDueDate?: string | null;
  openIssueCount?: number;
  issues?: Array<{ id: string; issueType: ItemProductionIssueType; note: string | null }>;
};

type Kpis = {
  total: number;
  inProduction: number;
  awaitingQc: number;
  readyToShip: number;
  needsAttention: number;
  atRisk: number;
  delayed: number;
  stale: number;
};

function riskTone(risk: ItemProductionRiskStatus): "neutral" | "info" | "success" | "warning" | "danger" {
  if (risk === "ON_TRACK") return "success";
  if (risk === "NEEDS_ATTENTION") return "warning";
  if (risk === "AT_RISK" || risk === "DELAYED" || risk === "BLOCKED") return "danger";
  return "neutral";
}

function toStartOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function differenceInDays(target: Date, now: Date) {
  const ms = toStartOfDay(target).getTime() - toStartOfDay(now).getTime();
  return Math.round(ms / (24 * 60 * 60 * 1000));
}

type FilterMap = Record<string, string>;
type AlertItem = {
  key: string;
  label: string;
  description: string;
  value: number;
  tone: "warning" | "danger" | "info";
  filter: FilterMap;
};

function getCurrentStage(item: ListItem) {
  const applicable = item.stages.filter((s) => s.isApplicable && s.status !== "SKIPPED");
  if (item.currentStageKey) {
    const byKey = applicable.find((s) => s.stageKey === item.currentStageKey);
    if (byKey) return byKey;
  }
  return (
    applicable.find((s) => s.status === "IN_PROGRESS" || s.status === "BLOCKED") ??
    applicable.find((s) => s.status === "NOT_STARTED") ??
    null
  );
}

function isExceptionRow(item: ListItem) {
  return (
    item.riskStatus !== "ON_TRACK" ||
    (item.openIssueCount ?? 0) > 0 ||
    isNextActionOverdue(item.nextAction, item.nextActionDueDate)
  );
}

type QuickUpdateTarget = {
  productionItemId: string;
  orderItemId: string;
  rowVersion: number;
  orderedQuantity: number;
  stage: StageCell;
};

export default function ItemProductionTimelineManager() {
  const toast = useAdminToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<ListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [stageDrawerId, setStageDrawerId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [batchPanelId, setBatchPanelId] = useState<string | null>(null);
  const [quickUpdate, setQuickUpdate] = useState<QuickUpdateTarget | null>(null);
  const [issueItemId, setIssueItemId] = useState<string | null>(null);
  const [resolveIssueTarget, setResolveIssueTarget] = useState<{
    productionItemId: string;
    issues: Array<{ id: string; issueType: ItemProductionIssueType; note: string | null }>;
  } | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [employees, setEmployees] = useState<Array<{ id: string; fullName: string }>>([]);

  const orderFilter = searchParams.get("order") ?? searchParams.get("orderId") ?? "";

  const page = Number(searchParams.get("page") ?? "1") || 1;
  const pageSize = Number(searchParams.get("pageSize") ?? "20") || 20;
  const search = searchParams.get("search") ?? "";

  const queryString = useMemo(() => searchParams.toString(), [searchParams]);

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(searchParams.toString());
      if (!value) next.delete(key);
      else next.set(key, value);
      if (key !== "page") next.delete("page");
      router.replace(`${pathname}?${next.toString()}`);
    },
    [pathname, router, searchParams],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/manufacturing/production-items?${queryString}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Không tải được danh sách");
      setItems(json.items ?? []);
      setTotal(json.total ?? 0);
      setKpis(json.kpis ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi tải dữ liệu");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    async function loadEmployees() {
      const res = await fetch("/api/employees?isActive=true&pageSize=100");
      const json = await res.json();
      if (!cancelled && res.ok) {
        setEmployees((json.items ?? json.employees ?? []).map((e: { id: string; fullName: string }) => ({
          id: e.id,
          fullName: e.fullName,
        })));
      }
    }
    void loadEmployees();
    return () => {
      cancelled = true;
    };
  }, []);

  function applyKpiFilter(filter: Record<string, string> | null) {
    const next = new URLSearchParams();
    if (filter) {
      for (const [k, v] of Object.entries(filter)) next.set(k, v);
    }
    router.replace(`${pathname}?${next.toString()}`);
  }

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const shippingToday = useMemo(
    () => {
      const now = new Date();
      return items.filter((item) => {
        if (!item.promisedDeliveryDate) return false;
        return differenceInDays(new Date(item.promisedDeliveryDate), now) === 0;
      }).length;
    },
    [items],
  );

  const alerts = useMemo(() => {
    const now = new Date();
    const delayed = items.filter((item) => item.riskStatus === "DELAYED").length;
    const blocked = items.filter((item) => item.riskStatus === "BLOCKED").length;
    const missingSupplier = items.filter(
      (item) =>
        (item.productionStatus === "IN_PRODUCTION" || item.productionStatus === "FINISHING") &&
        !item.supplier &&
        !item.batchSummary?.usesBatchExecution,
    ).length;
    const unallocated = items.filter((item) => (item.batchSummary?.unallocatedQuantity ?? 0) > 0).length;
    const batchNoSupplier = items.filter((item) =>
      item.batchSummary?.usesBatchExecution && item.batchSummary.supplierCount === 0,
    ).length;
    const stale = items.filter((item) => {
      if (!item.lastProgressAt) return true;
      const days = differenceInDays(now, new Date(item.lastProgressAt));
      return days >= ITEM_PRODUCTION_RISK_CONFIG.staleUpdateDays;
    }).length;
    return [
      {
        key: "blocked",
        label: "Sản xuất bị chặn",
        description: "Có công đoạn đang bị chặn.",
        value: blocked,
        tone: "warning" as const,
        filter: { riskStatus: "BLOCKED" } as FilterMap,
      },
      {
        key: "delayed",
        label: "Sản xuất trễ hạn",
        description: "Đã quá ngày giao dự kiến.",
        value: delayed,
        tone: "danger" as const,
        filter: { riskStatus: "DELAYED" } as FilterMap,
      },
      {
        key: "missing-supplier",
        label: "Thiếu xưởng phụ trách",
        description: "Đang sản xuất nhưng chưa gán xưởng.",
        value: missingSupplier,
        tone: "warning" as const,
        filter: { productionStatus: "IN_PRODUCTION" } as FilterMap,
      },
      {
        key: "shipping-today",
        label: "Cần giao hôm nay",
        description: "Item có ngày giao là hôm nay.",
        value: shippingToday,
        tone: "info" as const,
        filter: { shippingToday: "1" } as FilterMap,
      },
      {
        key: "unallocated",
        label: "Chưa phân bổ lô",
        description: "Còn số lượng chưa chia lô.",
        value: unallocated,
        tone: "warning" as const,
        filter: { unallocated: "1" } as FilterMap,
      },
      {
        key: "batch-no-supplier",
        label: "Lô thiếu xưởng",
        description: "Lô đang hoạt động chưa gán xưởng.",
        value: batchNoSupplier,
        tone: "warning" as const,
        filter: { hasBatches: "1" } as FilterMap,
      },
      {
        key: "stale",
        label: "Quá hạn cập nhật",
        description: `Chưa cập nhật trên ${ITEM_PRODUCTION_RISK_CONFIG.staleUpdateDays} ngày.`,
        value: stale,
        tone: "warning" as const,
        filter: { onlyStale: "1" } as FilterMap,
      },
    ].filter((entry): entry is AlertItem => entry.value > 0);
  }, [items, shippingToday]);

  const filteredItems = useMemo(() => {
    const now = new Date();
    if (searchParams.get("shippingToday") !== "1") return items;
    return items.filter((item) => {
      if (!item.promisedDeliveryDate) return false;
      return differenceInDays(new Date(item.promisedDeliveryDate), now) === 0;
    });
  }, [items, searchParams]);

  const stickyOffsets = { order: 0, product: 100, stage: 340 };
  const orderFilterActive = Boolean(orderFilter);

  async function patchItemField(
    itemId: string,
    patch: Record<string, string | null>,
    rowVersion: number,
  ) {
    const res = await fetch(`/api/manufacturing/production-items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...patch, expectedRowVersion: rowVersion }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message ?? "Cập nhật thất bại");
    toast.success("Đã cập nhật");
    void load();
  }

  return (
    <div className="admin-panel">
      {orderFilterActive ? <ItemProductionOrderHeader orderId={orderFilter} /> : null}
      <div
        className="admin-catalog-kpi-bar"
        style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10, marginBottom: 16 }}
      >
        {[
          { key: "inProduction", label: "Đang SX", value: kpis?.inProduction ?? 0, tone: "#166534", bg: "#ecfdf3", filter: { productionStatus: "IN_PRODUCTION" } as FilterMap },
          { key: "needsAttention", label: "Cần chú ý", value: kpis?.needsAttention ?? 0, tone: "#a16207", bg: "#fffbeb", filter: { riskStatus: "NEEDS_ATTENTION" } as FilterMap },
          { key: "delayed", label: "Đã trễ", value: kpis?.delayed ?? 0, tone: "#991b1b", bg: "#fef2f2", filter: { riskStatus: "DELAYED" } as FilterMap },
          { key: "readyToShip", label: "Sẵn sàng giao", value: kpis?.readyToShip ?? 0, tone: "#1d4ed8", bg: "#eff6ff", filter: { readyToShip: "1" } as FilterMap },
          { key: "shippingToday", label: "Giao hôm nay", value: shippingToday, tone: "#0f766e", bg: "#f0fdfa", filter: { shippingToday: "1" } as FilterMap },
          { key: "stale", label: "Quá hạn cập nhật", value: kpis?.stale ?? 0, tone: "#7c2d12", bg: "#fff7ed", filter: { onlyStale: "1" } as FilterMap },
        ].map((card) => (
          <button
            key={card.key}
            type="button"
            className="admin-catalog-kpi"
            style={{ textAlign: "left", cursor: "pointer", border: "1px solid #e5e7eb", background: card.bg, color: card.tone }}
            onClick={() => applyKpiFilter(card.filter)}
          >
            <strong>{card.value}</strong>
            <span>{card.label}</span>
          </button>
        ))}
      </div>

      {alerts.length > 0 ? (
        <section className="admin-section-card" style={{ marginBottom: 14 }}>
          <div className="admin-section-header">
            <h3 className="admin-subtitle" style={{ margin: 0 }}>
              Alert Center
            </h3>
            <span className="admin-field-hint">{alerts.length} cảnh báo hoạt động</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 8 }}>
            {alerts.map((alert) => (
              <button
                key={alert.key}
                type="button"
                onClick={() => applyKpiFilter(alert.filter)}
                className="admin-btn admin-btn--secondary"
                style={{ textAlign: "left", padding: "10px 12px", borderColor: alert.tone === "danger" ? "#ef4444" : undefined }}
              >
                <div style={{ fontWeight: 700 }}>{alert.label}</div>
                <div className="admin-field-hint">
                  {alert.value} item · {alert.description}
                </div>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <DataToolbar>
        <input
          className="admin-input"
          placeholder="Tìm đơn, khách, sản phẩm, SKU, xưởng…"
          defaultValue={search}
          onChange={(e) => {
            const value = e.target.value;
            window.clearTimeout((window as unknown as { __iptSearch?: number }).__iptSearch);
            (window as unknown as { __iptSearch?: number }).__iptSearch = window.setTimeout(() => {
              setParam("search", value.trim() || null);
            }, 300);
          }}
          style={{ flex: "1 1 220px", minWidth: 180 }}
        />
        <select
          className="admin-select"
          value={searchParams.get("riskStatus") ?? ""}
          onChange={(e) => setParam("riskStatus", e.target.value || null)}
        >
          <option value="">Mức rủi ro</option>
          {Object.entries(ITEM_PRODUCTION_RISK_LABELS).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
        <select
          className="admin-select"
          value={searchParams.get("productionStatus") ?? ""}
          onChange={(e) => setParam("productionStatus", e.target.value || null)}
        >
          <option value="">Trạng thái SX</option>
          {Object.entries(ITEM_PRODUCTION_STATUS_LABELS).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
        <select
          className="admin-select"
          value={searchParams.get("currentStage") ?? ""}
          onChange={(e) => setParam("currentStage", e.target.value || null)}
        >
          <option value="">Công đoạn</option>
          {Object.entries(ITEM_PRODUCTION_STAGE_SHORT_LABELS).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
        <select
          className="admin-select"
          value={searchParams.get("pic") ?? searchParams.get("assignedEmployeeId") ?? ""}
          onChange={(e) => setParam("pic", e.target.value || null)}
        >
          <option value="">PIC</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.fullName}
            </option>
          ))}
        </select>
        <label className="admin-field-hint" style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={searchParams.get("hasIssue") === "1"}
            onChange={(e) => setParam("hasIssue", e.target.checked ? "1" : null)}
          />
          Có vấn đề
        </label>
        <label className="admin-field-hint" style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={searchParams.get("readyToShip") === "1"}
            onChange={(e) => setParam("readyToShip", e.target.checked ? "1" : null)}
          />
          Sẵn sàng giao
        </label>
        <label className="admin-field-hint" style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={searchParams.get("onlyDelayed") === "1"}
            onChange={(e) => setParam("onlyDelayed", e.target.checked ? "1" : null)}
          />
          Chỉ đã trễ
        </label>
        <label className="admin-field-hint" style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={searchParams.get("shippingToday") === "1"}
            onChange={(e) => setParam("shippingToday", e.target.checked ? "1" : null)}
          />
          Giao hôm nay
        </label>
        <label className="admin-field-hint" style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={searchParams.get("unallocated") === "1"}
            onChange={(e) => setParam("unallocated", e.target.checked ? "1" : null)}
          />
          Chưa phân bổ
        </label>
        <label className="admin-field-hint" style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={searchParams.get("hasBatches") === "1"}
            onChange={(e) => setParam("hasBatches", e.target.checked ? "1" : null)}
          />
          Có lô
        </label>
        <WorkspaceToolbarEnd>
          <button type="button" className="admin-btn admin-btn--secondary" onClick={() => void load()}>
            Làm mới
          </button>
        </WorkspaceToolbarEnd>
      </DataToolbar>

      {loading ? (
        <AdminLoadingState label="Đang tải tiến độ sản xuất…" rows={5} />
      ) : error ? (
        <EmptyState
          tone="error"
          title="Không tải được tiến độ sản xuất"
          description={error}
          action={
            <button type="button" className="admin-btn" onClick={() => void load()}>
              Thử lại
            </button>
          }
        />
      ) : filteredItems.length === 0 ? (
        <EmptyState
          title="Chưa có item sản xuất"
          description="Khởi tạo theo dõi từ chi tiết đơn hàng để bắt đầu theo dõi tiến độ theo item."
          action={
            <Link href="/admin/orders" className="admin-btn admin-btn--primary">
              Mở danh sách đơn hàng
            </Link>
          }
        />
      ) : (
        <>
          <div className="admin-table-wrap" style={{ overflowX: "auto" }}>
            <table className="admin-table admin-table--compact">
              <thead>
                <tr>
                  {!orderFilterActive ? (
                    <th style={{ position: "sticky", left: stickyOffsets.order, background: "var(--admin-surface, #fff)", zIndex: 3, minWidth: 90 }}>
                      Đơn
                    </th>
                  ) : null}
                  {!orderFilterActive ? <th style={{ minWidth: 120 }}>Khách</th> : null}
                  <th style={{ position: "sticky", left: orderFilterActive ? 0 : stickyOffsets.product, background: "var(--admin-surface, #fff)", zIndex: 3, minWidth: 220 }}>
                    Sản phẩm
                  </th>
                  <th style={{ minWidth: 70 }}>SL đặt</th>
                  <th style={{ minWidth: 110 }}>Mẫu</th>
                  <th style={{ position: "sticky", left: orderFilterActive ? 220 : stickyOffsets.stage, background: "var(--admin-surface, #fff)", zIndex: 3, minWidth: 150 }}>
                    Công đoạn
                  </th>
                  <th style={{ minWidth: 80 }}>Sẵn sàng</th>
                  <th style={{ minWidth: 160 }}>Việc tiếp theo</th>
                  <th style={{ minWidth: 90 }}>Hạn giao</th>
                  <th style={{ minWidth: 100 }}>PIC</th>
                  <th style={{ minWidth: 90 }}>Rủi ro</th>
                  <th style={{ minWidth: 80 }} className="hide-on-narrow">Vấn đề</th>
                  <th style={{ minWidth: 130 }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  const now = new Date();
                  const customer =
                    item.orderItem.order.customer?.name ||
                    item.orderItem.order.customerCompanyName ||
                    item.orderItem.order.customerNameSnapshot ||
                    "—";
                  const image =
                    item.orderItem.designMediaAsset?.thumbnailUrl ||
                    item.orderItem.designMediaAsset?.url ||
                    item.orderItem.designImageUrl;
                  const currentStage = getCurrentStage(item);
                  const exception = isExceptionRow(item);
                  const sampleStatus = item.sampleStatus ?? "NOT_STARTED";
                  const sampleWarning = sampleStatus !== "APPROVED";
                  return (
                    <Fragment key={item.id}>
                      <tr
                        style={{
                          background: exception ? (item.riskStatus === "DELAYED" || item.riskStatus === "BLOCKED" ? "#fef2f2" : "#fffbeb") : undefined,
                        }}
                      >
                        {!orderFilterActive ? (
                          <td style={{ position: "sticky", left: stickyOffsets.order, background: "inherit", zIndex: 2 }}>
                            <button type="button" className="admin-link" onClick={() => setDetailId(item.id)}>
                              {item.orderItem.order.orderNo}
                            </button>
                          </td>
                        ) : null}
                        {!orderFilterActive ? <td>{customer}</td> : null}
                        <td style={{ position: "sticky", left: orderFilterActive ? 0 : stickyOffsets.product, background: "inherit", zIndex: 2 }}>
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            {image ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={image} alt="" width={32} height={32} style={{ objectFit: "cover", borderRadius: 4 }} />
                            ) : null}
                            <div>
                              <strong>{item.orderItem.productNameSnapshot ?? "Item"}</strong>
                              <div className="admin-field-hint">
                                {item.orderItem.skuSnapshot || item.orderItem.id.slice(0, 8)}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>{item.orderedQuantity.toLocaleString("vi-VN")}</td>
                        <td>
                          <select
                            className="admin-select admin-select--small"
                            value={sampleStatus}
                            onChange={(e) =>
                              void patchItemField(
                                item.id,
                                { sampleStatus: e.target.value },
                                item.rowVersion,
                              ).catch((err) => toast.error(err instanceof Error ? err.message : "Lỗi"))
                            }
                            style={{ fontSize: 12, maxWidth: 130 }}
                          >
                            {Object.entries(ITEM_PRODUCTION_SAMPLE_STATUS_LABELS).map(([k, label]) => (
                              <option key={k} value={k}>
                                {label}
                              </option>
                            ))}
                          </select>
                          {sampleWarning ? (
                            <div className="admin-field-hint" style={{ color: "#b45309" }}>
                              {sampleStatus === "NEEDS_REVISION" ? "Cần chỉnh mẫu" : "Chưa duyệt mẫu"}
                            </div>
                          ) : null}
                          <div style={{ marginTop: 4 }}>
                            <Link
                              href={`/admin/production/jobs/${item.orderItem.id}#production-approval`}
                              className={`prod-approval-badge ${
                                item.productionApprovalArtworkStale
                                  ? "prod-approval-badge--stale"
                                  : item.productionApprovalStatus === "RELEASED"
                                    ? "prod-approval-badge--ok"
                                    : "prod-approval-badge--warn"
                              }`}
                            >
                              {item.productionApprovalArtworkStale
                                ? "⚠ Artwork lệch"
                                : item.productionApprovalStatus === "RELEASED"
                                  ? "✓ Đã duyệt SX"
                                  : "⚠ Chưa duyệt SX"}
                            </Link>
                          </div>
                        </td>
                        <td style={{ position: "sticky", left: orderFilterActive ? 220 : stickyOffsets.stage, background: "inherit", zIndex: 2 }}>
                          {item.batchSummary?.usesBatchExecution ? (
                            <button type="button" className="admin-link" onClick={() => setBatchPanelId(item.id)}>
                              Theo dõi lô
                            </button>
                          ) : currentStage ? (
                            <button
                              type="button"
                              className="admin-link"
                              onClick={() =>
                                setQuickUpdate({
                                  productionItemId: item.id,
                                  orderItemId: item.orderItem.id,
                                  rowVersion: item.rowVersion,
                                  orderedQuantity: item.orderedQuantity,
                                  stage: currentStage,
                                })
                              }
                              title="Cập nhật nhanh"
                            >
                              {ITEM_PRODUCTION_STAGE_SHORT_LABELS[currentStage.stageKey]} ·{" "}
                              {currentStage.completedQuantity.toLocaleString("vi-VN")} /{" "}
                              {item.plannedQuantity.toLocaleString("vi-VN")}
                            </button>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td>
                          <strong>
                            {item.readyQuantity}/{item.orderedQuantity}
                          </strong>
                        </td>
                        <td>
                          <ItemProductionNextActionCell
                            productionItemId={item.id}
                            rowVersion={item.rowVersion}
                            nextAction={item.nextAction ?? null}
                            nextActionDueDate={item.nextActionDueDate ?? null}
                            onSaved={() => {
                              toast.success("Đã cập nhật việc tiếp theo");
                              void load();
                            }}
                          />
                        </td>
                        <td>
                          <input
                            className="admin-input"
                            type="date"
                            defaultValue={item.promisedDeliveryDate?.slice(0, 10) ?? ""}
                            onBlur={(e) => {
                              const v = e.target.value;
                              void patchItemField(
                                item.id,
                                { promisedDeliveryDate: v || null },
                                item.rowVersion,
                              ).catch((err) => toast.error(err instanceof Error ? err.message : "Lỗi"));
                            }}
                            style={{ fontSize: 12, padding: "4px 6px", maxWidth: 130 }}
                          />
                        </td>
                        <td>
                          <select
                            className="admin-select admin-select--small"
                            value={item.assignedEmployee?.id ?? ""}
                            onChange={(e) =>
                              void patchItemField(
                                item.id,
                                { assignedEmployeeId: e.target.value || null },
                                item.rowVersion,
                              ).catch((err) => toast.error(err instanceof Error ? err.message : "Lỗi"))
                            }
                            style={{ fontSize: 12, maxWidth: 120 }}
                          >
                            <option value="">—</option>
                            {employees.map((e) => (
                              <option key={e.id} value={e.id}>
                                {e.fullName}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          {item.riskStatus === "ON_TRACK" ? (
                            <span className="admin-field-hint">{ITEM_PRODUCTION_RISK_LABELS[item.riskStatus]}</span>
                          ) : (
                            <StatusBadge tone={riskTone(item.riskStatus)}>
                              {ITEM_PRODUCTION_RISK_LABELS[item.riskStatus]}
                            </StatusBadge>
                          )}
                        </td>
                        <td>
                          {(item.openIssueCount ?? 0) > 0 ? (
                            <button
                              type="button"
                              className="admin-btn admin-btn--link admin-btn--small"
                              style={{ padding: 0 }}
                              onClick={() =>
                                setResolveIssueTarget({
                                  productionItemId: item.id,
                                  issues: item.issues ?? [],
                                })
                              }
                            >
                              <StatusBadge tone="warning">{item.openIssueCount} vấn đề</StatusBadge>
                            </button>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                            {currentStage && !item.batchSummary?.usesBatchExecution ? (
                              <button
                                type="button"
                                className="admin-btn admin-btn--primary admin-btn--small"
                                onClick={() =>
                                  setQuickUpdate({
                                    productionItemId: item.id,
                                    orderItemId: item.orderItem.id,
                                    rowVersion: item.rowVersion,
                                    orderedQuantity: item.orderedQuantity,
                                    stage: currentStage,
                                  })
                                }
                              >
                                Cập nhật nhanh
                              </button>
                            ) : null}
                            <button
                              type="button"
                              className="admin-btn admin-btn--secondary admin-btn--small"
                              onClick={() => setIssueItemId(item.id)}
                            >
                              Báo vấn đề
                            </button>
                            <button
                              type="button"
                              className="admin-btn admin-btn--secondary admin-btn--small"
                              onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                            >
                              {expandedId === item.id ? "Thu gọn" : "Chi tiết"}
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedId === item.id ? (
                        <tr key={`${item.id}-detail`}>
                          <td colSpan={orderFilterActive ? 11 : 13} style={{ background: "#f9fafb", padding: 12 }}>
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                              {item.stages
                                .filter((s) => s.isApplicable && s.status !== "SKIPPED")
                                .map((s) => (
                                  <span
                                    key={s.id}
                                    className="admin-field-hint"
                                    style={{
                                      padding: "4px 8px",
                                      borderRadius: 6,
                                      border: "1px solid #e5e7eb",
                                      background:
                                        s.status === "COMPLETED"
                                          ? "#ecfdf3"
                                          : s.status === "IN_PROGRESS" || s.status === "BLOCKED"
                                            ? "#eff6ff"
                                            : "#fff",
                                      color: s.status === "NOT_STARTED" ? "#9ca3af" : undefined,
                                    }}
                                  >
                                    {ITEM_PRODUCTION_STAGE_SHORT_LABELS[s.stageKey]}: {s.completedQuantity}
                                    {s.status === "COMPLETED" ? " ✓" : ""}
                                  </span>
                                ))}
                            </div>
                            <div style={{ display: "flex", gap: 8 }}>
                              <button type="button" className="admin-btn admin-btn--secondary admin-btn--small" onClick={() => setDetailId(item.id)}>
                                Chi tiết đầy đủ
                              </button>
                              {currentStage ? (
                                <button type="button" className="admin-btn admin-btn--secondary admin-btn--small" onClick={() => setStageDrawerId(currentStage.id)}>
                                  Công đoạn nâng cao
                                </button>
                              ) : null}
                              {item.batchSummary?.hasBatches ? (
                                <button type="button" className="admin-btn admin-btn--secondary admin-btn--small" onClick={() => setBatchPanelId(item.id)}>
                                  Quản lý lô
                                </button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
            <span className="admin-field-hint">
              Trang {page}/{pageCount} · {total} item
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className="admin-btn admin-btn--secondary"
                disabled={page <= 1}
                onClick={() => setParam("page", String(page - 1))}
              >
                Trước
              </button>
              <button
                type="button"
                className="admin-btn admin-btn--secondary"
                disabled={page >= pageCount}
                onClick={() => setParam("page", String(page + 1))}
              >
                Sau
              </button>
            </div>
          </div>
        </>
      )}

      {issueItemId ? (
        <ItemProductionIssueModal
          productionItemId={issueItemId}
          onClose={() => setIssueItemId(null)}
          onSaved={() => {
            toast.success("Đã ghi nhận vấn đề");
            void load();
          }}
        />
      ) : null}
      {resolveIssueTarget ? (
        <ItemProductionResolveIssueModal
          productionItemId={resolveIssueTarget.productionItemId}
          issues={resolveIssueTarget.issues}
          onClose={() => setResolveIssueTarget(null)}
          onSaved={() => {
            toast.success("Đã xử lý vấn đề");
            void load();
          }}
        />
      ) : null}
      {quickUpdate ? (
        <ItemProductionQuickUpdateModal
          productionItemId={quickUpdate.productionItemId}
          orderItemId={quickUpdate.orderItemId}
          stage={quickUpdate.stage}
          rowVersion={quickUpdate.rowVersion}
          orderedQuantity={quickUpdate.orderedQuantity}
          onClose={() => setQuickUpdate(null)}
          onSaved={() => {
            toast.success("Đã cập nhật tiến độ");
            void load();
          }}
        />
      ) : null}
      {stageDrawerId ? (
        <ItemProductionStageDrawer
          stageId={stageDrawerId}
          onClose={() => setStageDrawerId(null)}
          onUpdated={() => {
            toast.success("Đã cập nhật tiến độ");
            void load();
          }}
        />
      ) : null}
      {batchPanelId ? (
        <ItemProductionBatchPanel
          productionItemId={batchPanelId}
          onClose={() => setBatchPanelId(null)}
          onUpdated={() => void load()}
        />
      ) : null}
      {detailId ? (
        <ItemProductionDetailDrawer
          productionItemId={detailId}
          onClose={() => setDetailId(null)}
          onOpenStage={(stageId) => {
            setDetailId(null);
            setStageDrawerId(stageId);
          }}
          onUpdated={() => void load()}
        />
      ) : null}
    </div>
  );
}
