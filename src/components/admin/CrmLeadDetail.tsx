"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { LeadStatus } from "@prisma/client";
import LeadSourceDisplay from "@/components/admin/LeadSourceDisplay";
import LeadStatusBadge from "@/components/admin/LeadStatusBadge";
import { CRM_STATUS_LABELS } from "@/features/crm/labels";
import { formatCrmCurrency, formatCrmDateTime } from "@/features/crm/format";
import {
  CRM_LEAD_STATUSES,
  type CrmLeadNoteRecord,
  type CrmLeadRecord,
} from "@/features/crm/types";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";

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
  const [estimatedValue, setEstimatedValue] = useState(
    initialLead.estimatedValue ? initialLead.estimatedValue.replace(/[^\d]/g, "") : ""
  );
  const [noteContent, setNoteContent] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingFollowUp, setSavingFollowUp] = useState(false);
  const [savingValue, setSavingValue] = useState(false);
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

  async function saveEstimatedValue() {
    setSavingValue(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/crm/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estimatedValue: estimatedValue.trim() ? Number(estimatedValue) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.message ?? "Cập nhật thất bại" });
        return;
      }
      setLead(data.lead);
      setEstimatedValue(
        data.lead.estimatedValue ? data.lead.estimatedValue.replace(/[^\d]/g, "") : ""
      );
      setMessage({ type: "success", text: "Đã cập nhật giá trị" });
      router.refresh();
    } catch {
      setMessage({ type: "error", text: "Cập nhật thất bại" });
    } finally {
      setSavingValue(false);
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
        <div className="admin-crm-detail-header">
          <h2 className="admin-subtitle">{lead.fullName}</h2>
          <LeadStatusBadge status={lead.status} />
        </div>
        <dl className="admin-crm-info-grid">
          <div>
            <dt>Số điện thoại</dt>
            <dd>{lead.phone}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{lead.email || "—"}</dd>
          </div>
          <div>
            <dt>Công ty</dt>
            <dd>{lead.company || "—"}</dd>
          </div>
          <div>
            <dt>Nguồn</dt>
            <dd>
              <LeadSourceDisplay lead={lead} />
            </dd>
          </div>
          <div>
            <dt>Giá trị</dt>
            <dd>{formatCrmCurrency(lead.estimatedValue)}</dd>
          </div>
          <div>
            <dt>Ngày tạo</dt>
            <dd>{formatCrmDateTime(lead.createdAt)}</dd>
          </div>
        </dl>
        {lead.message && (
          <div className="admin-crm-message">
            <p className="admin-dashboard-label">Tin nhắn</p>
            <p style={{ whiteSpace: "pre-wrap" }}>{lead.message}</p>
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
          <AdminLoadingButton
            type="button"
            pending={savingStatus}
            pendingLabel="Đang lưu trạng thái…"
            onClick={() => void saveStatus()}
          >
            Lưu trạng thái
          </AdminLoadingButton>
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
          <AdminLoadingButton
            type="button"
            pending={savingFollowUp}
            pendingLabel="Đang lưu follow-up…"
            onClick={() => void saveFollowUp()}
          >
            Lưu follow-up
          </AdminLoadingButton>
        </div>
      </section>

      <section className="admin-crm-section">
        <h2 className="admin-subtitle">Giá trị dự kiến</h2>
        <div className="admin-crm-inline-form">
          <input
            type="text"
            inputMode="numeric"
            placeholder="Ví dụ: 20000000"
            value={estimatedValue}
            onChange={(e) => setEstimatedValue(e.target.value.replace(/[^\d]/g, ""))}
            className="admin-input"
          />
          <AdminLoadingButton
            type="button"
            pending={savingValue}
            pendingLabel="Đang lưu giá trị…"
            onClick={() => void saveEstimatedValue()}
          >
            Lưu giá trị
          </AdminLoadingButton>
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
          <AdminLoadingButton
            type="submit"
            pending={savingNote}
            pendingLabel="Đang thêm ghi chú…"
            disabled={!noteContent.trim()}
          >
            Thêm ghi chú
          </AdminLoadingButton>
        </form>

        {notes.length === 0 ? (
          <div className="admin-empty-state">
            <p>Chưa có ghi chú.</p>
          </div>
        ) : (
          <ul className="admin-crm-notes">
            {notes.map((note) => (
              <li key={note.id}>
                <time>{formatCrmDateTime(note.createdAt)}</time>
                <p>{note.content}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
