"use client";

import { useState } from "react";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";
import { ITEM_PRODUCTION_ISSUE_TYPE_LABELS } from "@/features/item-production-tracking/labels";
import type { ItemProductionIssueType } from "@prisma/client";

type Props = {
  productionItemId: string;
  onClose: () => void;
  onSaved: () => void;
};

export default function ItemProductionIssueModal({ productionItemId, onClose, onSaved }: Props) {
  const [issueType, setIssueType] = useState<ItemProductionIssueType>("OTHER");
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/manufacturing/production-items/${productionItemId}/issues`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issueType, note: note || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Ghi nhận thất bại");
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ghi nhận thất bại");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="prod-plan-drawer-overlay" role="presentation" onClick={onClose} style={{ zIndex: 55 }}>
      <div
        role="dialog"
        aria-label="Báo vấn đề"
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
        <h3 className="admin-subtitle" style={{ marginTop: 0 }}>Báo vấn đề</h3>
        {error ? <p className="admin-error">{error}</p> : null}
        <div style={{ display: "grid", gap: 10 }}>
          <label className="admin-label">
            Loại vấn đề
            <select
              className="admin-select"
              value={issueType}
              onChange={(e) => setIssueType(e.target.value as ItemProductionIssueType)}
            >
              {Object.entries(ITEM_PRODUCTION_ISSUE_TYPE_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="admin-label">
            Ghi chú ngắn
            <textarea className="admin-input" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
          <button type="button" className="admin-btn admin-btn--secondary" onClick={onClose}>
            Hủy
          </button>
          <AdminLoadingButton pending={pending} variant="primary" onClick={() => void save()}>
            Ghi nhận
          </AdminLoadingButton>
        </div>
      </div>
    </div>
  );
}
