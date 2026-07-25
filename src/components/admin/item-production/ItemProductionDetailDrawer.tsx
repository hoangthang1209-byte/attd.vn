"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminLoadingState, EmptyState, StatusBadge } from "@/components/admin/AdminUi";
import {
  ITEM_PRODUCTION_RISK_LABELS,
  ITEM_PRODUCTION_STATUS_LABELS,
} from "@/features/item-production-tracking/labels";
import { ITEM_PRODUCTION_STAGE_LABELS } from "@/features/item-production-tracking/config";

type Props = {
  productionItemId: string;
  onClose: () => void;
  onOpenStage: (stageId: string) => void;
  onUpdated: () => void;
};

type TabKey = "overview" | "progress" | "sizes" | "qc" | "history";

export default function ItemProductionDetailDrawer({
  productionItemId,
  onClose,
  onOpenStage,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("overview");
  const [item, setItem] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/manufacturing/production-items/${productionItemId}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.message ?? "Không tải được chi tiết");
        if (!cancelled) setItem(json.item);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Lỗi tải");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    queueMicrotask(() => {
      void load();
    });
    return () => {
      cancelled = true;
    };
  }, [productionItemId]);

  const orderItem = item?.orderItem as
    | {
        id: string;
        productNameSnapshot: string | null;
        colorSnapshot: string | null;
        skuSnapshot: string | null;
        variants: Array<{ id: string; sizeValue: string | null; quantity: number; colorNameSnapshot: string | null }>;
        order: { id: string; orderNo: string };
      }
    | undefined;
  const stages = (item?.stages as Array<Record<string, unknown>>) ?? [];

  return (
    <div className="prod-plan-drawer-overlay" role="presentation" onClick={onClose}>
      <aside className="prod-plan-drawer" role="dialog" aria-label="Chi tiết item sản xuất" onClick={(e) => e.stopPropagation()}>
        <div className="admin-section-header">
          <h2 className="admin-subtitle">Chi tiết tiến độ item</h2>
          <button type="button" className="admin-btn admin-btn--secondary" onClick={onClose}>
            Đóng
          </button>
        </div>

        {loading ? (
          <AdminLoadingState label="Đang tải chi tiết…" rows={5} />
        ) : error || !item || !orderItem ? (
          <EmptyState tone="error" title="Không tải được chi tiết" description={error ?? "Thiếu dữ liệu"} />
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            <p style={{ margin: 0 }}>
              <Link href={`/admin/orders/${orderItem.order.id}`} className="admin-link">
                {orderItem.order.orderNo}
              </Link>{" "}
              · {orderItem.productNameSnapshot ?? "Sản phẩm"}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {(
                [
                  ["overview", "Tổng quan"],
                  ["progress", "Tiến độ"],
                  ["sizes", "Size & số lượng"],
                  ["qc", "QC & sự cố"],
                  ["history", "Lịch sử cập nhật"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className={`admin-btn admin-btn--small ${tab === key ? "admin-btn--primary" : "admin-btn--secondary"}`}
                  onClick={() => setTab(key)}
                >
                  {label}
                </button>
              ))}
            </div>

            {tab === "overview" ? (
              <div style={{ display: "grid", gap: 8 }}>
                <div>
                  Trạng thái:{" "}
                  {ITEM_PRODUCTION_STATUS_LABELS[item.productionStatus as keyof typeof ITEM_PRODUCTION_STATUS_LABELS]}
                </div>
                <StatusBadge tone="warning">
                  {ITEM_PRODUCTION_RISK_LABELS[item.riskStatus as keyof typeof ITEM_PRODUCTION_RISK_LABELS]}
                </StatusBadge>
                <div>
                  Tiến độ: {Number(item.progressPercent).toLocaleString("vi-VN")}% · Sẵn sàng giao:{" "}
                  {String(item.readyQuantity)}/{String(item.plannedQuantity)}
                </div>
                <div className="admin-field-hint">
                  SKU: {orderItem.skuSnapshot ?? "—"} · Màu: {orderItem.colorSnapshot ?? "—"}
                </div>
              </div>
            ) : null}

            {tab === "progress" ? (
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
                {stages.map((stage) => (
                  <li key={String(stage.id)}>
                    <button
                      type="button"
                      className="admin-btn admin-btn--secondary"
                      style={{ width: "100%", textAlign: "left" }}
                      onClick={() => onOpenStage(String(stage.id))}
                    >
                      {String(stage.labelSnapshot) ||
                        ITEM_PRODUCTION_STAGE_LABELS[stage.stageKey as keyof typeof ITEM_PRODUCTION_STAGE_LABELS]}{" "}
                      · {String(stage.status)} · {String(stage.completedQuantity)}/{String(stage.plannedQuantity)}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}

            {tab === "sizes" ? (
              orderItem.variants.length === 0 ? (
                <p className="admin-field-hint">Không có breakdown size trên item này (V1 read-only).</p>
              ) : (
                <div className="admin-table-wrap">
                  <table className="admin-table admin-table--compact">
                    <thead>
                      <tr>
                        <th>Size</th>
                        <th>Màu</th>
                        <th>Đặt hàng</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderItem.variants.map((v) => (
                        <tr key={v.id}>
                          <td>{v.sizeValue ?? "—"}</td>
                          <td>{v.colorNameSnapshot ?? "—"}</td>
                          <td>{v.quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : null}

            {tab === "qc" ? (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {stages
                  .filter((s) => Number(s.rejectedQuantity) > 0 || Number(s.reworkQuantity) > 0)
                  .map((s) => (
                    <li key={String(s.id)}>
                      {String(s.labelSnapshot)}: lỗi {String(s.rejectedQuantity)}, rework {String(s.reworkQuantity)}
                    </li>
                  ))}
                {stages.every((s) => Number(s.rejectedQuantity) === 0 && Number(s.reworkQuantity) === 0) ? (
                  <li className="admin-field-hint">Chưa có lỗi/rework ghi nhận trên các công đoạn.</li>
                ) : null}
              </ul>
            ) : null}

            {tab === "history" ? (
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
                {stages.flatMap((s) =>
                  ((s.history as Array<Record<string, unknown>>) ?? []).map((h) => (
                    <li key={String(h.id)} className="admin-field-hint">
                      {new Date(String(h.happenedAt)).toLocaleString("vi-VN")} · {String(s.labelSnapshot)} ·{" "}
                      {String(h.eventType)}
                      {h.note ? ` — ${String(h.note)}` : ""}
                    </li>
                  )),
                )}
              </ul>
            ) : null}
          </div>
        )}
      </aside>
    </div>
  );
}
