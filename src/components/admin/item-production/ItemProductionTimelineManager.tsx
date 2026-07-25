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
    return `${stage.completedQuantity}/${stage.plannedQuantity || "—"}`;
  }
  return "○";
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("vi-VN");
}

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

  const kpiCards = [
    { key: "total", label: "Tổng item", value: kpis?.total ?? 0, filter: null },
    { key: "inProduction", label: "Đang sản xuất", value: kpis?.inProduction ?? 0, filter: { productionStatus: "IN_PRODUCTION" } },
    { key: "awaitingQc", label: "Đang chờ QC", value: kpis?.awaitingQc ?? 0, filter: { currentStage: "QC" } },
    { key: "readyToShip", label: "Sẵn sàng giao", value: kpis?.readyToShip ?? 0, filter: { readyToShip: "1" } },
    { key: "needsAttention", label: "Cần chú ý", value: kpis?.needsAttention ?? 0, filter: { riskStatus: "NEEDS_ATTENTION" } },
    { key: "atRisk", label: "Nguy cơ trễ", value: kpis?.atRisk ?? 0, filter: { riskStatus: "AT_RISK" } },
    { key: "delayed", label: "Đã trễ", value: kpis?.delayed ?? 0, filter: { riskStatus: "DELAYED" } },
    { key: "stale", label: "Quá hạn cập nhật", value: kpis?.stale ?? 0, filter: { onlyStale: "1" } },
  ] as const;

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

  return (
    <div className="admin-panel">
      <div
        className="admin-catalog-kpi-bar"
        style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10, marginBottom: 16 }}
      >
        {kpiCards.map((card) => (
          <button
            key={card.key}
            type="button"
            className="admin-catalog-kpi"
            style={{ textAlign: "left", cursor: "pointer", border: "none" }}
            onClick={() => applyKpiFilter(card.filter ? { ...card.filter } : null)}
          >
            <strong>{card.value}</strong>
            <span>{card.label}</span>
          </button>
        ))}
      </div>

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
      ) : items.length === 0 ? (
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
                  <th style={{ position: "sticky", left: 0, background: "var(--admin-surface, #fff)", zIndex: 1 }}>Đơn</th>
                  <th>Khách hàng</th>
                  <th>Item / SP</th>
                  <th>SL</th>
                  <th>Sẵn sàng</th>
                  <th>Ngày giao</th>
                  <th>Xưởng</th>
                  <th>Phụ trách</th>
                  <th>TT / Rủi ro</th>
                  <th>Tiến độ</th>
                  {stageKeys.map((key) => (
                    <th key={key} title={ITEM_PRODUCTION_STAGE_LABELS[key]}>
                      {ITEM_PRODUCTION_STAGE_LABELS[key]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const customer =
                    item.orderItem.order.customer?.name ||
                    item.orderItem.order.customerCompanyName ||
                    item.orderItem.order.customerNameSnapshot ||
                    "—";
                  const image =
                    item.orderItem.designMediaAsset?.thumbnailUrl ||
                    item.orderItem.designMediaAsset?.url ||
                    item.orderItem.designImageUrl;
                  const stageMap = new Map(item.stages.map((s) => [s.stageKey, s]));
                  return (
                    <tr key={item.id}>
                      <td style={{ position: "sticky", left: 0, background: "var(--admin-surface, #fff)" }}>
                        <button type="button" className="admin-link" onClick={() => setDetailId(item.id)}>
                          {item.orderItem.order.orderNo}
                        </button>
                      </td>
                      <td>{customer}</td>
                      <td>
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
                              {item.orderItem.colorSnapshot || item.orderItem.variantNameSnapshot || "—"} ·{" "}
                              {item.orderItem.skuSnapshot || item.orderItem.id.slice(0, 8)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>{item.orderedQuantity}</td>
                      <td>
                        {item.readyQuantity}/{item.plannedQuantity}
                      </td>
                      <td>{formatDate(item.promisedDeliveryDate)}</td>
                      <td>{item.supplier?.name ?? "—"}</td>
                      <td>{item.assignedEmployee?.fullName ?? "—"}</td>
                      <td>
                        <div style={{ display: "grid", gap: 4 }}>
                          <span>{ITEM_PRODUCTION_STATUS_LABELS[item.productionStatus]}</span>
                          <StatusBadge tone={riskTone(item.riskStatus)}>
                            {ITEM_PRODUCTION_RISK_LABELS[item.riskStatus]}
                          </StatusBadge>
                        </div>
                      </td>
                      <td>{Number(item.progressPercent).toLocaleString("vi-VN")}%</td>
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
                            <button
                              type="button"
                              className="admin-btn admin-btn--secondary admin-btn--small"
                              onClick={() => setStageDrawerId(stage.id)}
                              title={stage.labelSnapshot}
                            >
                              {stageCellContent(stage)}
                            </button>
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
