"use client";

import { useState } from "react";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";
import { ITEM_PRODUCTION_ISSUE_TYPE_LABELS } from "@/features/item-production-tracking/labels";
import type { ItemProductionIssueType } from "@prisma/client";

type OpenIssue = {
  id: string;
  issueType: ItemProductionIssueType;
  note: string | null;
};

type Props = {
  productionItemId: string;
  issues: OpenIssue[];
  onClose: () => void;
  onSaved: () => void;
};

export default function ItemProductionResolveIssueModal({
  productionItemId,
  issues,
  onClose,
  onSaved,
}: Props) {
  const [selectedId, setSelectedId] = useState(issues[0]?.id ?? "");
  const [resolvedNote, setResolvedNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!selectedId) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/manufacturing/production-items/${productionItemId}/issues/${selectedId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resolvedNote: resolvedNote || undefined }),
        },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Xử lý thất bại");
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xử lý thất bại");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="prod-plan-drawer-overlay" role="presentation" onClick={onClose} style={{ zIndex: 55 }}>
      <div
        role="dialog"
        aria-label="Xử lý vấn đề"
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
        <h3 className="admin-subtitle" style={{ marginTop: 0 }}>Xử lý vấn đề</h3>
        {error ? <p className="admin-error">{error}</p> : null}
        <div style={{ display: "grid", gap: 10 }}>
          {issues.length > 1 ? (
            <label className="admin-label">
              Chọn vấn đề
              <select
                className="admin-select"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
              >
                {issues.map((issue) => (
                  <option key={issue.id} value={issue.id}>
                    {ITEM_PRODUCTION_ISSUE_TYPE_LABELS[issue.issueType]}
                    {issue.note ? ` — ${issue.note.slice(0, 40)}` : ""}
                  </option>
                ))}
              </select>
            </label>
          ) : issues[0] ? (
            <p className="admin-field-hint">
              {ITEM_PRODUCTION_ISSUE_TYPE_LABELS[issues[0].issueType]}
              {issues[0].note ? `: ${issues[0].note}` : ""}
            </p>
          ) : null}
          <label className="admin-label">
            Ghi chú xử lý
            <textarea
              className="admin-input"
              rows={3}
              value={resolvedNote}
              onChange={(e) => setResolvedNote(e.target.value)}
              placeholder="Mô tả ngắn cách xử lý..."
            />
          </label>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
          <button type="button" className="admin-btn admin-btn--secondary" onClick={onClose}>
            Hủy
          </button>
          <AdminLoadingButton pending={pending} variant="primary" onClick={() => void save()}>
            Đã xử lý
          </AdminLoadingButton>
        </div>
      </div>
    </div>
  );
}
