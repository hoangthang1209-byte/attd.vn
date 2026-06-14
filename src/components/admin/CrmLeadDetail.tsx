"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { LeadStatus } from "@prisma/client";
import {
  CRM_SOURCE_LABELS,
  CRM_STATUS_LABELS,
} from "@/features/crm/labels";
import {
  CRM_LEAD_STATUSES,
  type CrmLeadNoteRecord,
  type CrmLeadRecord,
} from "@/features/crm/types";

function formatNoteTime(iso: string) {
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toDatetimeLocalValue(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function CrmLeadDetail({ initialLead }: { initialLead: CrmLeadRecord }) {
  const router = useRouter();
  const [lead, setLead] = useState(initialLead);
  const [notes, setNotes] = useState<CrmLeadNoteRecord[]>(initialLead.notes ?? []);
  const [status, setStatus] = useState<LeadStatus>(initialLead.status);
  const [followUpAt, setFollowUpAt] = useState(toDatetimeLocalValue(initialLead.followUpAt));
  const [noteContent, setNoteContent] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingFollowUp, setSavingFollowUp] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(
    null
  );

  async function saveStatus() {
    setSavingStatus(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/crm/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.message ?? "Cập nhật thất bại" });
        return;
      }
      setLead(data.lead);
      setMessage({ type: "success", text: "Đã cập nhật trạng thái" });
      router.refresh();
    } catch {
      setMessage({ type: "error", text: "Cập nhật thất bại" });
    } finally {
      setSavingStatus(false);
    }
  }

  async function saveFollowUp() {
    setSavingFollowUp(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/crm/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          followUpAt: followUpAt ? new Date(followUpAt).toISOString() : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.message ?? "Cập nhật thất bại" });
        return;
      }
      setLead(data.lead);
      setFollowUpAt(toDatetimeLocalValue(data.lead.followUpAt));
      setMessage({ type: "success", text: "Đã cập nhật follow-up" });
      router.refresh();
    } catch {
      setMessage({ type: "error", text: "Cập nhật thất bại" });
    } finally {
      setSavingFollowUp(false);
    }
  }

  async function addNote(event: React.FormEvent) {
    event.preventDefault();
    if (!noteContent.trim()) return;

    setSavingNote(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/crm/leads/${lead.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: noteContent.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.message ?? "Không thể thêm ghi chú" });
        return;
      }
      setNotes((prev) => [data.note, ...prev]);
      setNoteContent("");
      setMessage({ type: "success", text: "Đã thêm ghi chú" });
    } catch {
      setMessage({ type: "error", text: "Không thể thêm ghi chú" });
    } finally {
      setSavingNote(false);
    }
  }

  return (
    <div className="admin-panel">
      <p className="admin-empty-hint">
        <Link href="/admin/crm">← Quay lại CRM</Link>
      </p>

      {message && (
        <p className={`admin-message admin-message--${message.type}`}>{message.text}</p>
      )}

      <section className="admin-crm-section">
        <h2 className="admin-subtitle">Thông tin lead</h2>
        <dl className="admin-crm-info-grid">
          <div>
            <dt>Họ tên</dt>
            <dd>{lead.fullName}</dd>
          </div>
          <div>
            <dt>Số điện thoại</dt>
            <dd>{lead.phone}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{lead.email || "—"}</dd>
          </div>
          <div>
            <dt>C ty</dt>
            <dd>{lead.company || "—"}</dd>
          </div>
          <div>
            <dt>Nguồn</dt>
            <dd>{CRM_SOURCE_LABELS[lead.source]}</dd>
          </div>
          <div>
            <dt>Ngày tạo</dt>
            <dd>{formatNoteTime(lead.createdAt)}</dd>
          </div>
        </dl>
        {lead.message && (
          <div className="admin-crm-message">
            <p className="admin-dashboard-label">Tin nhắn</p>
            <p>{lead.message}</p>
          </div>
        )}
      </section>

      <section className="admin-crm-section">
        <h2 className="admin-subtitle">Trạng thái</h2>
        <div className="admin-crm-inline-form">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as LeadStatus)}
            className="admin-input"
          >
            {CRM_LEAD_STATUSES.map((item) => (
              <option key={item} value={item}>
                {CRM_STATUS_LABELS[item]}
              </option>
            ))}
          </select>
          <button type="button" className="admin-btn" onClick={() => void saveStatus()} disabled={savingStatus}>
            {savingStatus ? "Đang lưu..." : "Lưu trạng thái"}
          </button>
        </div>
      </section>

      <section className="admin-crm-section">
        <h2 className="admin-subtitle">Follow-up</h2>
        <div className="admin-crm-inline-form">
          <input
            type="datetime-local"
            value={followUpAt}
            onChange={(e) => setFollowUpAt(e.target.value)}
            className="admin-input"
          />
          <button
            type="button"
            className="admin-btn"
            onClick={() => void saveFollowUp()}
            disabled={savingFollowUp}
          >
            {savingFollowUp ? "Đang lưu..." : "Lưu follow-up"}
          </button>
        </div>
      </section>

      <section className="admin-crm-section">
        <h2 className="admin-subtitle">Ghi chú</h2>
        <form className="admin-crm-note-form" onSubmit={addNote}>
          <textarea
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            placeholder="Ví dụ: Đã gọi khách, đã gửi báo giá..."
            className="admin-input admin-textarea"
            rows={3}
          />
          <button type="submit" className="admin-btn" disabled={savingNote || !noteContent.trim()}>
            {savingNote ? "Đang thêm..." : "Thêm ghi chú"}
          </button>
        </form>

        {notes.length === 0 ? (
          <div className="admin-empty-state">
            <p>Chưa có ghi chú.</p>
          </div>
        ) : (
          <ul className="admin-crm-notes">
            {notes.map((note) => (
              <li key={note.id}>
                <time>{formatNoteTime(note.createdAt)}</time>
                <p>{note.content}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
