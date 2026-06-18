"use client";

import { useState } from "react";
import type { CRMActivityType } from "@prisma/client";
import { CRM_ACTIVITY_TYPE_LABELS } from "@/features/crm/labels";
import { CRM_ACTIVITY_TYPES } from "@/features/crm/types";

type Props = {
  leadId?: string;
  customerId?: string;
  onCreated: () => void;
};

export default function CrmAddActivityForm({ leadId, customerId, onCreated }: Props) {
  const [type, setType] = useState<CRMActivityType>("NOTE");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [outcome, setOutcome] = useState("");
  const [nextFollowUpAt, setNextFollowUpAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/crm/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId,
          customerId,
          type,
          title,
          content: content || null,
          outcome: outcome || null,
          nextFollowUpAt: nextFollowUpAt || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Không thể thêm hoạt động");
        return;
      }
      setTitle("");
      setContent("");
      setOutcome("");
      setNextFollowUpAt("");
      onCreated();
    } catch {
      setError("Không thể thêm hoạt động");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="admin-form admin-form--compact" onSubmit={handleSubmit}>
      <div className="admin-form-grid">
        <label>
          Loại hoạt động
          <select
            className="admin-input"
            value={type}
            onChange={(e) => setType(e.target.value as CRMActivityType)}
          >
            {CRM_ACTIVITY_TYPES.map((t) => (
              <option key={t} value={t}>
                {CRM_ACTIVITY_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tiêu đề *
          <input
            className="admin-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="VD: Gọi xác nhận nhu cầu"
          />
        </label>
      </div>
      <label>
        Nội dung
        <textarea
          className="admin-input"
          rows={3}
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
      </label>
      <div className="admin-form-grid">
        <label>
          Kết quả
          <input
            className="admin-input"
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
          />
        </label>
        <label>
          Follow-up tiếp theo
          <input
            type="datetime-local"
            className="admin-input"
            value={nextFollowUpAt}
            onChange={(e) => setNextFollowUpAt(e.target.value)}
          />
        </label>
      </div>
      {error && <p className="admin-message admin-message--error">{error}</p>}
      <button type="submit" className="admin-btn admin-btn--primary" disabled={saving}>
        {saving ? "Đang lưu..." : "Thêm hoạt động"}
      </button>
    </form>
  );
}
