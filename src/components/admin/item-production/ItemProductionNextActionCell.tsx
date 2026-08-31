"use client";

import { useState } from "react";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";

type Props = {
  productionItemId: string;
  rowVersion: number;
  nextAction: string | null;
  nextActionDueDate: string | null;
  onSaved: () => void;
};

function formatDue(value: string | null) {
  if (!value) return "";
  return value.slice(0, 10);
}

function isOverdue(nextAction: string | null, due: string | null) {
  if (!nextAction?.trim() || !due) return false;
  const d = new Date(due);
  if (Number.isNaN(d.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d.getTime() < today.getTime();
}

/** Compact inline next-action editor for the production board. */
export default function ItemProductionNextActionCell({
  productionItemId,
  rowVersion,
  nextAction,
  nextActionDueDate,
  onSaved,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [action, setAction] = useState(nextAction ?? "");
  const [due, setDue] = useState(formatDue(nextActionDueDate));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const overdue = isOverdue(nextAction, nextActionDueDate);

  async function save() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/manufacturing/production-items/${productionItemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nextAction: action.trim() || null,
          nextActionDueDate: due || null,
          expectedRowVersion: rowVersion,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Lưu thất bại");
      setEditing(false);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lưu thất bại");
    } finally {
      setPending(false);
    }
  }

  if (!editing) {
    return (
      <button
        type="button"
        className="admin-link"
        onClick={() => {
          setAction(nextAction ?? "");
          setDue(formatDue(nextActionDueDate));
          setEditing(true);
        }}
        style={{
          textAlign: "left",
          maxWidth: 180,
          color: overdue ? "#b45309" : undefined,
          fontWeight: overdue ? 600 : undefined,
        }}
        title="Sửa việc tiếp theo"
      >
        {nextAction?.trim() ? (
          <>
            <div style={{ whiteSpace: "normal", lineHeight: 1.3 }}>{nextAction}</div>
            {nextActionDueDate ? (
              <div className="admin-field-hint" style={{ color: overdue ? "#b45309" : undefined }}>
                Hạn: {new Date(nextActionDueDate).toLocaleDateString("vi-VN")}
                {overdue ? " · Quá hạn" : ""}
              </div>
            ) : null}
          </>
        ) : (
          <span className="admin-field-hint">+ Việc tiếp theo</span>
        )}
      </button>
    );
  }

  return (
    <div style={{ display: "grid", gap: 4, minWidth: 160 }}>
      {error ? <p className="admin-error" style={{ margin: 0, fontSize: 12 }}>{error}</p> : null}
      <input
        className="admin-input"
        value={action}
        onChange={(e) => setAction(e.target.value)}
        placeholder="Việc tiếp theo"
        style={{ fontSize: 12 }}
      />
      <input
        className="admin-input"
        type="date"
        value={due}
        onChange={(e) => setDue(e.target.value)}
        style={{ fontSize: 12 }}
      />
      <div style={{ display: "flex", gap: 4 }}>
        <AdminLoadingButton pending={pending} variant="primary" className="admin-btn--small" onClick={() => void save()}>
          Lưu
        </AdminLoadingButton>
        <button
          type="button"
          className="admin-btn admin-btn--secondary admin-btn--small"
          onClick={() => {
            setAction("");
            setDue("");
            void (async () => {
              setPending(true);
              try {
                const res = await fetch(`/api/manufacturing/production-items/${productionItemId}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    nextAction: null,
                    nextActionDueDate: null,
                    expectedRowVersion: rowVersion,
                  }),
                });
                const json = await res.json();
                if (!res.ok) throw new Error(json.message ?? "Xóa thất bại");
                setEditing(false);
                onSaved();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Xóa thất bại");
              } finally {
                setPending(false);
              }
            })();
          }}
        >
          Xóa
        </button>
        <button type="button" className="admin-btn admin-btn--secondary admin-btn--small" onClick={() => setEditing(false)}>
          Hủy
        </button>
      </div>
    </div>
  );
}
