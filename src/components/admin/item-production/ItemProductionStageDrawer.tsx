"use client";

import { useEffect, useState } from "react";
import { AdminLoadingState, EmptyState, StatusBadge } from "@/components/admin/AdminUi";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";
import { ITEM_PRODUCTION_STAGE_LABELS } from "@/features/item-production-tracking/config";
import {
  ITEM_PRODUCTION_EVENT_LABELS,
  ITEM_PRODUCTION_RISK_LABELS,
  ITEM_PRODUCTION_STAGE_STATUS_LABELS,
} from "@/features/item-production-tracking/labels";
type StageAction = "START" | "PROGRESS_UPDATE" | "COMPLETE" | "BLOCK" | "UNBLOCK" | "REOPEN";

type Props = {
  stageId: string;
  onClose: () => void;
  onUpdated: () => void;
};

type ItemPayload = {
  id: string;
  rowVersion: number;
  orderedQuantity: number;
  plannedQuantity?: number;
  readyQuantity?: number;
  progressPercent?: number | string;
  riskStatus?: string;
  promisedDeliveryDate?: string | null;
  supplier: { name: string } | null;
  orderItem: {
    id: string;
    productNameSnapshot: string | null;
    colorSnapshot: string | null;
    order: { orderNo: string };
  };
  stages: Array<{
    id: string;
    stageKey: keyof typeof ITEM_PRODUCTION_STAGE_LABELS;
    labelSnapshot: string;
    status: keyof typeof ITEM_PRODUCTION_STAGE_STATUS_LABELS;
    plannedQuantity: number;
    receivedQuantity: number;
    completedQuantity: number;
    acceptedQuantity: number;
    rejectedQuantity: number;
    reworkQuantity: number;
    wasteQuantity: number;
  }>;
};

export default function ItemProductionStageDrawer({ stageId, onClose, onUpdated }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [item, setItem] = useState<ItemPayload | null>(null);
  const [history, setHistory] = useState<
    Array<{
      id: string;
      eventType: string;
      quantityDelta: number;
      note: string | null;
      happenedAt: string;
      createdByAdminUser: { username: string } | null;
    }>
  >([]);
  const [quantityDelta, setQuantityDelta] = useState(0);
  const [note, setNote] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const histRes = await fetch(`/api/manufacturing/production-stages/${stageId}/history`);
        const histJson = await histRes.json();
        if (!histRes.ok) throw new Error(histJson.message ?? "Không tải được lịch sử");
        const itemRes = await fetch(`/api/manufacturing/production-items/${histJson.productionItemId}`);
        const itemJson = await itemRes.json();
        if (!itemRes.ok) throw new Error(itemJson.message ?? "Không tải được item");
        if (cancelled) return;
        setItem(itemJson.item);
        setHistory(histJson.history ?? []);
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
  }, [stageId]);

  const stage = item?.stages.find((s) => s.id === stageId) ?? null;
  const progress = Number(item?.progressPercent ?? 0);
  const readyQty = Number(item?.readyQuantity ?? 0);
  const plannedQty = Number(item?.plannedQuantity ?? item?.orderedQuantity ?? 0);

  async function runAction(action: StageAction) {
    if (!item) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/manufacturing/production-stages/${stageId}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          quantityDelta: action === "PROGRESS_UPDATE" || action === "COMPLETE" ? quantityDelta : 0,
          note: note || undefined,
          expectedRowVersion: item.rowVersion,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Cập nhật thất bại");
      onUpdated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cập nhật thất bại");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="prod-plan-drawer-overlay" role="presentation" onClick={onClose}>
      <aside className="prod-plan-drawer" role="dialog" aria-label="Cập nhật công đoạn" onClick={(e) => e.stopPropagation()}>
        <div className="admin-section-header">
          <h2 className="admin-subtitle">Cập nhật công đoạn</h2>
          <button type="button" className="admin-btn admin-btn--secondary" onClick={onClose}>
            Đóng
          </button>
        </div>

        {loading ? (
          <AdminLoadingState label="Đang tải công đoạn…" rows={4} />
        ) : error && !item ? (
          <EmptyState tone="error" title="Không tải được công đoạn" description={error} />
        ) : item && stage ? (
          <div style={{ display: "grid", gap: 12 }}>
            {error ? <p className="admin-error">{error}</p> : null}
            <p className="admin-field-hint" style={{ margin: 0 }}>
              Đơn {item.orderItem.order.orderNo} · Item {item.orderItem.id.slice(0, 8)}…
            </p>
            <p style={{ margin: 0 }}>
              <strong>{item.orderItem.productNameSnapshot ?? "Sản phẩm"}</strong>
              <span className="admin-field-hint"> · {item.orderItem.colorSnapshot ?? "—"}</span>
            </p>
            <section className="admin-section-card" style={{ margin: 0 }}>
              <div style={{ display: "grid", gap: 8 }}>
                <div className="admin-field-hint">
                  Công đoạn hiện tại: {stage.labelSnapshot || ITEM_PRODUCTION_STAGE_LABELS[stage.stageKey]}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
                  <div>
                    <div className="admin-field-hint">Progress</div>
                    <strong>{progress.toLocaleString("vi-VN")}%</strong>
                  </div>
                  <div>
                    <div className="admin-field-hint">Ready Qty</div>
                    <strong>
                      {readyQty}/{plannedQty || item.orderedQuantity}
                    </strong>
                  </div>
                  <div>
                    <div className="admin-field-hint">ETA</div>
                    <strong>
                      {item.promisedDeliveryDate ? new Date(item.promisedDeliveryDate).toLocaleDateString("vi-VN") : "—"}
                    </strong>
                  </div>
                  <div>
                    <div className="admin-field-hint">Risk</div>
                    <StatusBadge tone="warning">
                      {item.riskStatus
                        ? ITEM_PRODUCTION_RISK_LABELS[item.riskStatus as keyof typeof ITEM_PRODUCTION_RISK_LABELS]
                        : "—"}
                    </StatusBadge>
                  </div>
                </div>
                <StatusBadge tone="info">{ITEM_PRODUCTION_STAGE_STATUS_LABELS[stage.status] ?? stage.status}</StatusBadge>
                <p className="admin-field-hint" style={{ margin: 0 }}>
                  SL đặt: {item.orderedQuantity} · Xưởng: {item.supplier?.name ?? "—"}
                </p>
              </div>
            </section>
            <section className="admin-section-card" style={{ margin: 0 }}>
              <h3 className="admin-subtitle" style={{ marginTop: 0 }}>
                Production Statistics
              </h3>
              <div
                className="admin-meta-grid"
                style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}
              >
                <div>Kế hoạch: {stage.plannedQuantity}</div>
                <div>Nhận: {stage.receivedQuantity}</div>
                <div>Hoàn thành: {stage.completedQuantity}</div>
                <div>Đạt: {stage.acceptedQuantity}</div>
                <div>Lỗi: {stage.rejectedQuantity}</div>
                <div>Rework: {stage.reworkQuantity}</div>
                <div>Hao hụt: {stage.wasteQuantity}</div>
              </div>
            </section>
            <section className="admin-section-card" style={{ margin: 0 }}>
              <h3 className="admin-subtitle" style={{ marginTop: 0 }}>
                Cập nhật công đoạn
              </h3>
              <div style={{ display: "grid", gap: 10 }}>
                <label className="admin-label">
                  Số lượng thêm trong lần cập nhật
                  <input
                    className="admin-input"
                    type="number"
                    min={0}
                    value={quantityDelta}
                    onChange={(e) => setQuantityDelta(Number(e.target.value) || 0)}
                  />
                </label>
                <label className="admin-label">
                  Ghi chú
                  <textarea className="admin-input" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
                </label>
              </div>
            </section>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <AdminLoadingButton pending={pending} onClick={() => void runAction("START")}>
                Bắt đầu công đoạn
              </AdminLoadingButton>
              <AdminLoadingButton pending={pending} variant="primary" onClick={() => void runAction("PROGRESS_UPDATE")}>
                Cập nhật tiến độ
              </AdminLoadingButton>
              <AdminLoadingButton pending={pending} onClick={() => void runAction("COMPLETE")}>
                Hoàn thành công đoạn
              </AdminLoadingButton>
              <AdminLoadingButton pending={pending} variant="secondary" onClick={() => void runAction("BLOCK")}>
                Đánh dấu bị chặn
              </AdminLoadingButton>
              <AdminLoadingButton pending={pending} variant="secondary" onClick={() => void runAction("UNBLOCK")}>
                Bỏ chặn
              </AdminLoadingButton>
              <AdminLoadingButton pending={pending} variant="secondary" onClick={() => void runAction("REOPEN")}>
                Mở lại công đoạn
              </AdminLoadingButton>
            </div>
            <div>
              <h3 className="admin-subtitle">Production History Timeline</h3>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
                {history.map((entry) => (
                  <li key={entry.id} className="admin-field-hint" style={{ borderLeft: "2px solid #d1d5db", paddingLeft: 8 }}>
                    {new Date(entry.happenedAt).toLocaleString("vi-VN")} ·{" "}
                    {ITEM_PRODUCTION_EVENT_LABELS[entry.eventType as keyof typeof ITEM_PRODUCTION_EVENT_LABELS] ??
                      entry.eventType}
                    {entry.quantityDelta ? ` · +${entry.quantityDelta}` : ""}
                    {entry.createdByAdminUser ? ` · ${entry.createdByAdminUser.username}` : ""}
                    {entry.note ? ` — ${entry.note}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
