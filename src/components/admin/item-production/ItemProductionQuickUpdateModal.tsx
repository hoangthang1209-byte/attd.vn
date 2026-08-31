"use client";

import { useEffect, useState } from "react";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";
import { ITEM_PRODUCTION_STAGE_LABELS } from "@/features/item-production-tracking/config";
import type { ItemProductionStageKey } from "@prisma/client";

type StageInfo = {
  id: string;
  stageKey: ItemProductionStageKey;
  labelSnapshot: string;
  status: string;
  plannedQuantity: number;
  completedQuantity: number;
  rejectedQuantity: number;
  reworkQuantity: number;
};

type Props = {
  productionItemId: string;
  stage: StageInfo;
  rowVersion: number;
  orderedQuantity: number;
  onClose: () => void;
  onSaved: () => void;
};

export default function ItemProductionQuickUpdateModal({
  productionItemId,
  stage,
  rowVersion,
  orderedQuantity,
  onClose,
  onSaved,
}: Props) {
  const [completed, setCompleted] = useState(stage.completedQuantity);
  const [rework, setRework] = useState(stage.rejectedQuantity + stage.reworkQuantity);
  const [markComplete, setMarkComplete] = useState(false);
  const [note, setNote] = useState("");
  const [advanced, setAdvanced] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCompleted(stage.completedQuantity);
    setRework(stage.rejectedQuantity + stage.reworkQuantity);
  }, [stage]);

  async function save() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/manufacturing/production-stages/${stage.id}/quick-update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          completedQuantity: completed,
          rejectedOrReworkQuantity: rework,
          markComplete,
          note: note || undefined,
          expectedRowVersion: rowVersion,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Cập nhật thất bại");
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cập nhật thất bại");
    } finally {
      setPending(false);
    }
  }

  const stageLabel = stage.labelSnapshot || ITEM_PRODUCTION_STAGE_LABELS[stage.stageKey];

  return (
    <div className="prod-plan-drawer-overlay" role="presentation" onClick={onClose} style={{ zIndex: 55 }}>
      <div
        role="dialog"
        aria-label="Cập nhật nhanh"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 10,
          padding: 20,
          width: "min(420px, calc(100vw - 32px))",
          margin: "10vh auto",
          boxShadow: "0 20px 40px rgba(0,0,0,.15)",
        }}
      >
        <h3 className="admin-subtitle" style={{ marginTop: 0 }}>Cập nhật nhanh</h3>
        <p className="admin-field-hint" style={{ margin: "0 0 12px" }}>
          Công đoạn: <strong>{stageLabel}</strong>
        </p>
        {error ? <p className="admin-error">{error}</p> : null}
        <div style={{ display: "grid", gap: 10 }}>
          <label className="admin-label">
            Hoàn thành
            <input
              className="admin-input"
              type="number"
              min={0}
              max={orderedQuantity}
              value={completed}
              onChange={(e) => setCompleted(Number(e.target.value) || 0)}
              autoFocus
            />
          </label>
          <label className="admin-label">
            Lỗi / làm lại <span className="admin-field-hint">(tùy chọn)</span>
            <input
              className="admin-input"
              type="number"
              min={0}
              value={rework}
              onChange={(e) => setRework(Number(e.target.value) || 0)}
            />
          </label>
          <label className="admin-field-hint" style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="checkbox" checked={markComplete} onChange={(e) => setMarkComplete(e.target.checked)} />
            Hoàn thành công đoạn
          </label>
          <label className="admin-label">
            Ghi chú
            <textarea className="admin-input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
          <button type="button" className="admin-link" onClick={() => setAdvanced((v) => !v)}>
            {advanced ? "Ẩn nâng cao" : "Nâng cao"}
          </button>
          {advanced ? (
            <p className="admin-field-hint" style={{ margin: 0 }}>
              Kế hoạch công đoạn: {stage.plannedQuantity} · Đặt hàng: {orderedQuantity}
            </p>
          ) : null}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
          <button type="button" className="admin-btn admin-btn--secondary" onClick={onClose}>
            Hủy
          </button>
          <AdminLoadingButton pending={pending} variant="primary" onClick={() => void save()}>
            Lưu
          </AdminLoadingButton>
        </div>
      </div>
    </div>
  );
}
