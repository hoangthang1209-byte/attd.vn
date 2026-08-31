"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { ITEM_PRODUCTION_STAGE_LABELS } from "@/features/item-production-tracking/config";
import {
  ITEM_PRODUCTION_RISK_LABELS,
  ITEM_PRODUCTION_STATUS_LABELS,
} from "@/features/item-production-tracking/labels";
import type { ItemProductionRiskStatus, ItemProductionStageKey, ItemProductionStatus } from "@prisma/client";
import ItemProductionStageDrawer from "@/components/admin/item-production/ItemProductionStageDrawer";
import ItemProductionDetailDrawer from "@/components/admin/item-production/ItemProductionDetailDrawer";
import ItemProductionBatchPanel from "@/components/admin/item-production/ItemProductionBatchPanel";
import { ITEM_PRODUCTION_RISK_CONFIG } from "@/features/item-production-tracking/config";

type StageCell = {
  id: string;
  stageKey: ItemProductionStageKey;
  labelSnapshot: string;
  sequence: number;
  isApplicable: boolean;
  status: string;
  plannedQuantity: number;
  completedQuantity: number;
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

function stageCellContent(stage: StageCell) {
  if (!stage.isApplicable || stage.status === "SKIPPED") return "—";
  if (stage.status === "BLOCKED") return "!";
  if (stage.status === "COMPLETED") return "✓";
  if (stage.status === "IN_PROGRESS") {
    return "●";
  }
  return "—";
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("vi-VN");
}

function toStartOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function differenceInDays(target: Date, now: Date) {
  const ms = toStartOfDay(target).getTime() - toStartOfDay(now).getTime();
  return Math.round(ms / (24 * 60 * 60 * 1000));
}

function relativeTime(value: string | null) {
  if (!value) return "Chưa cập nhật";
  const now = Date.now();
  const ts = new Date(value).getTime();
  const diffMs = Math.max(0, now - ts);
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return `${days} ngày trước`;
}

function stageTone(status: string): "neutral" | "info" | "warning" | "success" {
  if (status === "COMPLETED") return "success";
  if (status === "IN_PROGRESS") return "info";
  if (status === "BLOCKED") return "warning";
  return "neutral";
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

  function applyKpiFilter(filter: Record<string, string> | null) {
    const next = new URLSearchParams();
    if (filter) {
      for (const [k, v] of Object.entries(filter)) next.set(k, v);
    }
    router.replace(`${pathname}?${next.toString()}`);
  }

  const stageKeys = useMemo(() => {
    const keys = new Set<ItemProductionStageKey>();
    for (const item of items) {
      for (const stage of item.stages) keys.add(stage.stageKey);
    }
    return (Object.keys(ITEM_PRODUCTION_STAGE_LABELS) as ItemProductionStageKey[]).filter((k) =>
      keys.size === 0 ? true : keys.has(k),
    );
  }, [items]);

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

  const stickyOffsets = { order: 0, product: 110, progress: 390, risk: 510 };
  return (
    <div className="admin-panel">
      <div
        className="admin-catalog-kpi-bar"
        style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10, marginBottom: 16 }}
      >
        {[
          { key: "inProduction", label: "In Production", value: kpis?.inProduction ?? 0, tone: "#166534", bg: "#ecfdf3", filter: { productionStatus: "IN_PRODUCTION" } as FilterMap },
          { key: "needsAttention", label: "Needs Attention", value: kpis?.needsAttention ?? 0, tone: "#a16207", bg: "#fffbeb", filter: { riskStatus: "NEEDS_ATTENTION" } as FilterMap },
          { key: "delayed", label: "Delayed", value: kpis?.delayed ?? 0, tone: "#991b1b", bg: "#fef2f2", filter: { riskStatus: "DELAYED" } as FilterMap },
          { key: "readyToShip", label: "Ready to Ship", value: kpis?.readyToShip ?? 0, tone: "#1d4ed8", bg: "#eff6ff", filter: { readyToShip: "1" } as FilterMap },
          { key: "shippingToday", label: "Shipping Today", value: shippingToday, tone: "#0f766e", bg: "#f0fdfa", filter: { shippingToday: "1" } as FilterMap },
          { key: "stale", label: "Overdue Updates", value: kpis?.stale ?? 0, tone: "#7c2d12", bg: "#fff7ed", filter: { onlyStale: "1" } as FilterMap },
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
                  <th style={{ position: "sticky", left: stickyOffsets.order, background: "var(--admin-surface, #fff)", zIndex: 3, minWidth: 110 }}>
                    Đơn
                  </th>
                  <th style={{ minWidth: 160 }}>Khách hàng</th>
                  <th style={{ position: "sticky", left: stickyOffsets.product, background: "var(--admin-surface, #fff)", zIndex: 3, minWidth: 280 }}>
                    Sản phẩm / SKU
                  </th>
                  <th style={{ minWidth: 130 }}>Lô SX</th>
                  <th style={{ minWidth: 130 }}>Xưởng</th>
                  <th style={{ minWidth: 120 }}>PIC</th>
                  <th style={{ position: "sticky", left: stickyOffsets.progress, background: "var(--admin-surface, #fff)", zIndex: 3, minWidth: 120 }}>
                    Tiến độ
                  </th>
                  <th style={{ position: "sticky", left: stickyOffsets.risk, background: "var(--admin-surface, #fff)", zIndex: 3, minWidth: 130 }}>
                    Rủi ro
                  </th>
                  <th style={{ minWidth: 110 }}>Số lượng</th>
                  <th style={{ minWidth: 140 }}>Sẵn sàng giao</th>
                  <th style={{ minWidth: 130 }}>ETA</th>
                  <th style={{ minWidth: 110 }}>Ngày giao</th>
                  <th style={{ minWidth: 120 }}>Cập nhật</th>
                  {stageKeys.map((key) => (
                    <th key={key} title={ITEM_PRODUCTION_STAGE_LABELS[key]}>
                      {ITEM_PRODUCTION_STAGE_LABELS[key]}
                    </th>
                  ))}
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
                  const progress = Number(item.progressPercent);
                  const readyRatio = item.plannedQuantity > 0 ? Math.round((item.readyQuantity / item.plannedQuantity) * 100) : 0;
                  const etaText = (() => {
                    if (!item.promisedDeliveryDate) return "—";
                    const days = differenceInDays(new Date(item.promisedDeliveryDate), now);
                    if (days < 0) return `Trễ ${Math.abs(days)} ngày`;
                    if (days === 0) return "Hôm nay";
                    return `Còn ${days} ngày`;
                  })();
                  const stageMap = new Map(item.stages.map((s) => [s.stageKey, s]));
                  return (
                    <tr key={item.id}>
                      <td style={{ position: "sticky", left: stickyOffsets.order, background: "var(--admin-surface, #fff)", zIndex: 2 }}>
                        <button type="button" className="admin-link" onClick={() => setDetailId(item.id)}>
                          {item.orderItem.order.orderNo}
                        </button>
                      </td>
                      <td>{customer}</td>
                      <td style={{ position: "sticky", left: stickyOffsets.product, background: "var(--admin-surface, #fff)", zIndex: 2 }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          {image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={image} alt="" width={36} height={36} style={{ objectFit: "cover", borderRadius: 4 }} />
                          ) : null}
                          <div>
                            <button type="button" className="admin-link" onClick={() => setDetailId(item.id)}>
                              {item.orderItem.productNameSnapshot ?? "Item"}
                            </button>
                            <div className="admin-field-hint">
                              {item.orderItem.colorSnapshot || item.orderItem.variantNameSnapshot || "—"} · SKU{" "}
                              {item.orderItem.skuSnapshot || item.orderItem.id.slice(0, 8)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        {item.batchSummary?.hasBatches ? (
                          <div>
                            <button type="button" className="admin-link" onClick={() => setBatchPanelId(item.id)}>
                              {item.batchSummary.batchCount} lô
                            </button>
                            <div className="admin-field-hint">
                              {item.batchSummary.allocatedQuantity.toLocaleString("vi-VN")} /{" "}
                              {item.plannedQuantity.toLocaleString("vi-VN")} đã phân bổ
                            </div>
                            {item.batchSummary.unallocatedQuantity > 0 ? (
                              <div className="admin-field-hint" style={{ color: "#b45309" }}>
                                {item.batchSummary.unallocatedQuantity.toLocaleString("vi-VN")} chưa phân bổ
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <button type="button" className="admin-btn admin-btn--secondary admin-btn--small" onClick={() => setBatchPanelId(item.id)}>
                            Chia lô sản xuất
                          </button>
                        )}
                      </td>
                      <td>
                        {item.batchSummary?.usesBatchExecution
                          ? `${item.batchSummary.supplierCount} xưởng`
                          : item.supplier?.name ?? "—"}
                      </td>
                      <td>{item.assignedEmployee?.fullName ?? "—"}</td>
                      <td style={{ position: "sticky", left: stickyOffsets.progress, background: "var(--admin-surface, #fff)", zIndex: 2 }}>
                        <div style={{ display: "grid", gap: 5 }}>
                          <div style={{ height: 8, borderRadius: 999, background: "#e5e7eb", overflow: "hidden" }}>
                            <div style={{ width: `${Math.min(100, Math.max(0, progress))}%`, height: "100%", background: "#2563eb" }} />
                          </div>
                          <strong>{progress.toLocaleString("vi-VN")}%</strong>
                        </div>
                      </td>
                      <td style={{ position: "sticky", left: stickyOffsets.risk, background: "var(--admin-surface, #fff)", zIndex: 2 }}>
                        <StatusBadge tone={riskTone(item.riskStatus)}>{ITEM_PRODUCTION_RISK_LABELS[item.riskStatus]}</StatusBadge>
                      </td>
                      <td>
                        <div>{item.orderedQuantity}</div>
                        <div className="admin-field-hint">{ITEM_PRODUCTION_STATUS_LABELS[item.productionStatus]}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700 }}>
                          {item.readyQuantity}/{item.plannedQuantity}
                        </div>
                        <div className="admin-field-hint">{readyRatio}%</div>
                      </td>
                      <td>{etaText}</td>
                      <td>{formatDate(item.promisedDeliveryDate)}</td>
                      <td>{relativeTime(item.lastProgressAt)}</td>
                      {stageKeys.map((key) => {
                        const stage = stageMap.get(key);
                        if (!stage) {
                          return (
                            <td key={key} className="admin-field-hint">
                              —
                            </td>
                          );
                        }
                        return (
                          <td key={key}>
                            {item.batchSummary?.usesBatchExecution ? (
                              <span className="admin-field-hint">Lô</span>
                            ) : (
                            <button
                              type="button"
                              className="admin-btn admin-btn--secondary admin-btn--small"
                              onClick={() => setStageDrawerId(stage.id)}
                              title={stage.labelSnapshot}
                              style={{
                                minWidth: 34,
                                fontWeight: 700,
                                borderColor:
                                  stage.status === "BLOCKED"
                                    ? "#f59e0b"
                                    : stage.status === "COMPLETED"
                                      ? "#16a34a"
                                      : stage.status === "IN_PROGRESS"
                                        ? "#2563eb"
                                        : "#d1d5db",
                                color:
                                  stage.status === "BLOCKED"
                                    ? "#b45309"
                                    : stage.status === "COMPLETED"
                                      ? "#166534"
                                      : stage.status === "IN_PROGRESS"
                                        ? "#1d4ed8"
                                        : "#6b7280",
                                background:
                                  stageTone(stage.status) === "success"
                                    ? "#ecfdf3"
                                    : stageTone(stage.status) === "info"
                                      ? "#eff6ff"
                                      : stageTone(stage.status) === "warning"
                                        ? "#fffbeb"
                                        : "#fff",
                              }}
                            >
                              {stageCellContent(stage)}
                            </button>
                            )}
                          </td>
                        );
                      })}
                    </tr>
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
