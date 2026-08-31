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
  batchId: string;
  batchStageId: string;
  onClose: () => void;
  onUpdated: () => void;
};

type BatchPayload = {
  id: string;
  code: string;
  plannedQuantity: number;
  readyQuantity: number;
  progressPercent: number | string;
  riskStatus: string;
  supplier: { name: string } | null;
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

export default function ItemProductionBatchStageDrawer({ batchId, batchStageId, onClose, onUpdated }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [batch, setBatch] = useState<BatchPayload | null>(null);
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
        const histRes = await fetch(
          `/api/manufacturing/production-batches/${batchId}/stages/${batchStageId}/history`,
        );
        const histJson = await histRes.json();
        if (!histRes.ok) throw new Error(histJson.message ?? "Không tải được lịch sử");
        const batchRes = await fetch(`/api/manufacturing/production-batches/${batchId}`);
        const batchJson = await batchRes.json();
        if (!batchRes.ok) throw new Error(batchJson.message ?? "Không tải được lô");
        if (cancelled) return;
        setBatch(batchJson.batch);
        setHistory(histJson.history ?? []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Lỗi tải");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [batchId, batchStageId]);

  const stage = batch?.stages.find((s) => s.id === batchStageId) ?? null;
  const progress = Number(batch?.progressPercent ?? 0);
  const readyQty = Number(batch?.readyQuantity ?? 0);
  const plannedQty = Number(batch?.plannedQuantity ?? 0);

  async function runAction(action: StageAction) {
    if (!batch) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/manufacturing/production-batches/${batchId}/stages/${batchStageId}/progress`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            quantityDelta: action === "PROGRESS_UPDATE" || action === "COMPLETE" ? quantityDelta : 0,
            note: note || undefined,
          }),
        },
      );
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
    <div className="prod-plan-drawer-overlay" role="presentation" onClick={onClose} style={{ zIndex: 60 }}>
      <aside className="prod-plan-drawer" role="dialog" aria-label="Cập nhật công đoạn lô" onClick={(e) => e.stopPropagation()}>
        <div className="admin-section-header">
          <h2 className="admin-subtitle">Cập nhật công đoạn lô</h2>
          <button type="button" className="admin-btn admin-btn--secondary" onClick={onClose}>Đóng</button>
        </div>
        {loading ? (
          <AdminLoadingState label="Đang tải…" rows={4} />
        ) : error && !batch ? (
          <EmptyState tone="error" title="Không tải được công đoạn" description={error} />
        ) : batch && stage ? (
          <div style={{ display: "grid", gap: 12 }}>
            {error ? <p className="admin-error">{error}</p> : null}
            <p className="admin-field-hint" style={{ margin: 0 }}>Lô {batch.code}</p>
            <section className="admin-section-card" style={{ margin: 0 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
                <div><div className="admin-field-hint">Tiến độ</div><strong>{progress.toLocaleString("vi-VN")}%</strong></div>
                <div><div className="admin-field-hint">Sẵn sàng</div><strong>{readyQty}/{plannedQty}</strong></div>
                <div><div className="admin-field-hint">Xưởng</div><strong>{batch.supplier?.name ?? "—"}</strong></div>
                <div>
                  <div className="admin-field-hint">Rủi ro</div>
                  <StatusBadge tone="warning">
                    {ITEM_PRODUCTION_RISK_LABELS[batch.riskStatus as keyof typeof ITEM_PRODUCTION_RISK_LABELS] ?? batch.riskStatus}
                  </StatusBadge>
                </div>
              </div>
              <StatusBadge tone="info">{ITEM_PRODUCTION_STAGE_STATUS_LABELS[stage.status] ?? stage.status}</StatusBadge>
            </section>
            <section className="admin-section-card" style={{ margin: 0 }}>
              <h3 className="admin-subtitle" style={{ marginTop: 0 }}>{stage.labelSnapshot}</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
                <div>Kế hoạch: {stage.plannedQuantity}</div>
                <div>Hoàn thành: {stage.completedQuantity}</div>
                <div>Đạt: {stage.acceptedQuantity}</div>
                <div>Lỗi: {stage.rejectedQuantity}</div>
                <div>Rework: {stage.reworkQuantity}</div>
                <div>Hao hụt: {stage.wasteQuantity}</div>
              </div>
            </section>
            <label className="admin-label">
              Số lượng thêm
              <input className="admin-input" type="number" min={0} value={quantityDelta} onChange={(e) => setQuantityDelta(Number(e.target.value) || 0)} />
            </label>
            <label className="admin-label">
              Ghi chú
              <textarea className="admin-input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <AdminLoadingButton pending={pending} onClick={() => void runAction("START")}>Bắt đầu</AdminLoadingButton>
              <AdminLoadingButton pending={pending} variant="primary" onClick={() => void runAction("PROGRESS_UPDATE")}>Cập nhật</AdminLoadingButton>
              <AdminLoadingButton pending={pending} onClick={() => void runAction("COMPLETE")}>Hoàn thành</AdminLoadingButton>
              <AdminLoadingButton pending={pending} variant="secondary" onClick={() => void runAction("BLOCK")}>Chặn</AdminLoadingButton>
              <AdminLoadingButton pending={pending} variant="secondary" onClick={() => void runAction("UNBLOCK")}>Bỏ chặn</AdminLoadingButton>
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 6 }}>
              {history.map((entry) => (
                <li key={entry.id} className="admin-field-hint" style={{ borderLeft: "2px solid #d1d5db", paddingLeft: 8 }}>
                  {new Date(entry.happenedAt).toLocaleString("vi-VN")} ·{" "}
                  {ITEM_PRODUCTION_EVENT_LABELS[entry.eventType as keyof typeof ITEM_PRODUCTION_EVENT_LABELS] ?? entry.eventType}
                  {entry.quantityDelta ? ` · +${entry.quantityDelta}` : ""}
                  {entry.createdByAdminUser ? ` · ${entry.createdByAdminUser.username}` : ""}
                  {entry.note ? ` — ${entry.note}` : ""}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
