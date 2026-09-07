"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
  orderItemId?: string;
  stage: StageInfo;
  rowVersion: number;
  orderedQuantity: number;
  onClose: () => void;
  onSaved: () => void;
};

export default function ItemProductionQuickUpdateModal({
  productionItemId: _productionItemId,
  orderItemId,
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
  const [gate, setGate] = useState<{
    message: string;
    productionJobHref: string;
    orderItemId: string;
  } | null>(null);
  const [bypassReason, setBypassReason] = useState("");
  const [showBypass, setShowBypass] = useState(false);

  useEffect(() => {
    setCompleted(stage.completedQuantity);
    setRework(stage.rejectedQuantity + stage.reworkQuantity);
  }, [stage]);

  async function save(withBypass?: boolean) {
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
          bypassReason: withBypass ? bypassReason.trim() : undefined,
        }),
      });
      const json = await res.json();
      if (res.status === 409 && json.code === "APPROVAL_REQUIRED") {
        setGate({
          message: json.message ?? "Sản phẩm chưa được duyệt sản xuất.",
          productionJobHref:
            json.productionJobHref ??
            `/admin/production/jobs/${json.orderItemId ?? orderItemId ?? ""}`,
          orderItemId: json.orderItemId ?? orderItemId ?? "",
        });
        setShowBypass(false);
        return;
      }
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
        {gate ? (
          <div
            role="alert"
            style={{
              marginBottom: 12,
              padding: 10,
              borderRadius: 8,
              background: "#fffbeb",
              border: "1px solid #fcd34d",
            }}
          >
            <p style={{ margin: "0 0 8px", fontWeight: 600 }}>{gate.message}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <Link href={`${gate.productionJobHref}#production-approval`} className="admin-btn admin-btn--primary admin-btn--xs">
                Mở duyệt sản xuất
              </Link>
              <button
                type="button"
                className="admin-btn admin-btn--secondary admin-btn--xs"
                onClick={() => setShowBypass((v) => !v)}
              >
                Tiếp tục dù chưa duyệt
              </button>
            </div>
            {showBypass ? (
              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                <label className="admin-label">
                  Lý do bypass (bắt buộc)
                  <textarea
                    className="admin-input"
                    rows={2}
                    value={bypassReason}
                    onChange={(e) => setBypassReason(e.target.value)}
                    placeholder="VD: Khách xác nhận miệng, chờ file Zalo"
                  />
                </label>
                <AdminLoadingButton
                  type="button"
                  variant="danger"
                  size="small"
                  pending={pending}
                  disabled={bypassReason.trim().length < 5}
                  onClick={() => void save(true)}
                >
                  Xác nhận tiếp tục
                </AdminLoadingButton>
              </div>
            ) : null}
          </div>
        ) : null}
        {error ? <p className="admin-error">{error}</p> : null}
        <div style={{ display: "grid", gap: 10 }}>
          <label className="admin-label">
            Hoàn thành
            <input
              className="admin-input"
              type="number"
              min={0}
              max={orderedQuantity || undefined}
              value={completed}
              onChange={(e) => setCompleted(Number(e.target.value))}
            />
          </label>
          <label className="admin-label" style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="checkbox" checked={markComplete} onChange={(e) => setMarkComplete(e.target.checked)} />
            Đánh dấu hoàn thành công đoạn
          </label>
          <button type="button" className="admin-link" onClick={() => setAdvanced((v) => !v)}>
            {advanced ? "Ẩn nâng cao" : "Nâng cao"}
          </button>
          {advanced ? (
            <>
              <label className="admin-label">
                Lỗi / làm lại
                <input
                  className="admin-input"
                  type="number"
                  min={0}
                  value={rework}
                  onChange={(e) => setRework(Number(e.target.value))}
                />
              </label>
              <label className="admin-label">
                Ghi chú
                <input className="admin-input" value={note} onChange={(e) => setNote(e.target.value)} />
              </label>
            </>
          ) : null}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button type="button" className="admin-btn admin-btn--secondary" onClick={onClose} disabled={pending}>
              Huỷ
            </button>
            <AdminLoadingButton type="button" variant="primary" pending={pending} onClick={() => void save(false)}>
              Lưu
            </AdminLoadingButton>
          </div>
        </div>
      </div>
    </div>
  );
}
