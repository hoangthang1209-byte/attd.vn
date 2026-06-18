"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { LeadPriority, LeadStatus } from "@prisma/client";
import LeadPriorityBadge from "@/components/admin/LeadPriorityBadge";
import LeadSourceDisplay from "@/components/admin/LeadSourceDisplay";
import LeadStatusBadge from "@/components/admin/LeadStatusBadge";
import CrmActivityTimeline from "@/components/admin/crm/CrmActivityTimeline";
import CrmAddActivityForm from "@/components/admin/crm/CrmAddActivityForm";
import CrmProductInterestForm, {
  CrmProductInterestList,
} from "@/components/admin/crm/CrmProductInterestForm";
import {
  CRM_PRIORITY_LABELS,
  CRM_STATUS_LABELS,
  displayLeadCompanyName,
  displayLeadContactName,
} from "@/features/crm/labels";
import { formatCrmCurrency, formatCrmDateTime } from "@/features/crm/format";
import {
  CRM_LEAD_PRIORITIES,
  CRM_LEAD_STATUSES,
  type CrmLeadRecord,
} from "@/features/crm/types";

function toDatetimeLocalValue(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function CrmLeadDetailView({ initialLead }: { initialLead: CrmLeadRecord }) {
  const router = useRouter();
  const [lead, setLead] = useState(initialLead);
  const [status, setStatus] = useState<LeadStatus>(initialLead.status);
  const [priority, setPriority] = useState<LeadPriority>(initialLead.priority);
  const [nextFollowUpAt, setNextFollowUpAt] = useState(
    toDatetimeLocalValue(initialLead.nextFollowUpAt ?? initialLead.followUpAt)
  );
  const [note, setNote] = useState(initialLead.note ?? "");
  const [demand, setDemand] = useState(initialLead.demand ?? "");
  const [saving, setSaving] = useState(false);
  const [converting, setConverting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const isConverted = Boolean(lead.convertedAt || lead.customerId);

  async function refreshLead() {
    const res = await fetch(`/api/crm/leads/${lead.id}`);
    const data = await res.json();
    if (res.ok && data.lead) {
      setLead(data.lead);
      setStatus(data.lead.status);
      setPriority(data.lead.priority);
    }
    router.refresh();
  }

  async function saveUpdates() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/crm/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          priority,
          nextFollowUpAt: nextFollowUpAt ? new Date(nextFollowUpAt).toISOString() : null,
          note,
          demand,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.message ?? "Cập nhật thất bại" });
        return;
      }
      setLead(data.lead);
      setMessage({ type: "success", text: "Đã cập nhật lead" });
      router.refresh();
    } catch {
      setMessage({ type: "error", text: "Cập nhật thất bại" });
    } finally {
      setSaving(false);
    }
  }

  async function convertToCustomer() {
    if (!confirm("Chuyển lead này thành khách hàng mới?")) return;
    setConverting(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/crm/leads/${lead.id}/convert`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.message ?? "Chuyển đổi thất bại" });
        return;
      }
      setLead(data.lead);
      setMessage({ type: "success", text: "Đã chuyển thành khách hàng" });
      router.refresh();
    } catch {
      setMessage({ type: "error", text: "Chuyển đổi thất bại" });
    } finally {
      setConverting(false);
    }
  }

  return (
    <div className="admin-panel">
      <div className="admin-crm-detail-header">
        <div>
          <p className="admin-crm-detail-code">{lead.code || lead.id}</p>
          <h2>{displayLeadCompanyName(lead) || displayLeadContactName(lead)}</h2>
          <div className="admin-crm-detail-badges">
            <LeadStatusBadge status={lead.status} />
            <LeadPriorityBadge priority={lead.priority} />
          </div>
        </div>
        <div className="admin-crm-detail-actions">
          <Link href="/admin/crm/leads" className="admin-btn admin-btn--secondary">
            ← Danh sách lead
          </Link>
          {!isConverted && (
            <button
              type="button"
              className="admin-btn admin-btn--primary"
              onClick={() => void convertToCustomer()}
              disabled={converting}
            >
              {converting ? "Đang chuyển..." : "Chuyển thành khách hàng"}
            </button>
          )}
        </div>
      </div>

      {isConverted && lead.customerId && (
        <p className="admin-message admin-message--success">
          Lead đã chuyển thành khách hàng.{" "}
          <Link href={`/admin/crm/customers/${lead.customerId}`}>Xem khách hàng</Link>
        </p>
      )}

      {message && (
        <p className={`admin-message admin-message--${message.type}`} role="alert">
          {message.text}
        </p>
      )}

      <div className="admin-crm-detail-grid">
        <section className="admin-section-card">
          <h3>Thông tin lead</h3>
          <dl className="admin-dl">
            <div>
              <dt>Công ty</dt>
              <dd>{displayLeadCompanyName(lead) || "—"}</dd>
            </div>
            <div>
              <dt>Người liên hệ</dt>
              <dd>{displayLeadContactName(lead)}</dd>
            </div>
            <div>
              <dt>SĐT</dt>
              <dd>{lead.phone}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{lead.email || "—"}</dd>
            </div>
            <div>
              <dt>Zalo</dt>
              <dd>{lead.zalo || "—"}</dd>
            </div>
            <div>
              <dt>Nguồn</dt>
              <dd>
                <LeadSourceDisplay lead={lead} />
              </dd>
            </div>
            <div>
              <dt>Giá trị ước tính</dt>
              <dd>{formatCrmCurrency(lead.estimatedValue)}</dd>
            </div>
            <div>
              <dt>Ngày tạo</dt>
              <dd>{formatCrmDateTime(lead.createdAt)}</dd>
            </div>
          </dl>

          <div className="admin-form admin-form--compact">
            <label>
              Trạng thái
              <select
                className="admin-input"
                value={status}
                onChange={(e) => setStatus(e.target.value as LeadStatus)}
              >
                {CRM_LEAD_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {CRM_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Ưu tiên
              <select
                className="admin-input"
                value={priority}
                onChange={(e) => setPriority(e.target.value as LeadPriority)}
              >
                {CRM_LEAD_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {CRM_PRIORITY_LABELS[p]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Follow-up
              <input
                type="datetime-local"
                className="admin-input"
                value={nextFollowUpAt}
                onChange={(e) => setNextFollowUpAt(e.target.value)}
              />
            </label>
            <label>
              Nhu cầu
              <textarea className="admin-input" rows={3} value={demand} onChange={(e) => setDemand(e.target.value)} />
            </label>
            <label>
              Ghi chú nội bộ
              <textarea className="admin-input" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
            </label>
            <button type="button" className="admin-btn admin-btn--primary" disabled={saving} onClick={() => void saveUpdates()}>
              {saving ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </div>
        </section>

        <section className="admin-section-card">
          <h3>Sản phẩm quan tâm</h3>
          <CrmProductInterestList interests={lead.productInterests ?? []} />
          <hr className="admin-divider" />
          <CrmProductInterestForm leadId={lead.id} onCreated={() => void refreshLead()} />
        </section>
      </div>

      <section className="admin-section-card">
        <h3>Hoạt động chăm sóc</h3>
        <CrmActivityTimeline activities={lead.activities ?? []} />
        <hr className="admin-divider" />
        <CrmAddActivityForm leadId={lead.id} onCreated={() => void refreshLead()} />
      </section>
    </div>
  );
}
