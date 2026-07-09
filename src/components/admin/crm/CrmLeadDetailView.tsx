"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { LeadPriority, LeadStatus } from "@prisma/client";
import LeadPriorityBadge from "@/components/admin/LeadPriorityBadge";
import LeadSourceDisplay from "@/components/admin/LeadSourceDisplay";
import LeadStatusBadge from "@/components/admin/LeadStatusBadge";
import CrmAddActivityForm from "@/components/admin/crm/CrmAddActivityForm";
import CrmConvertLeadPanel from "@/components/admin/crm/CrmConvertLeadPanel";
import CrmLeadTimeline from "@/components/admin/crm/CrmLeadTimeline";
import CrmProductInterestForm, {
  CrmProductInterestList,
} from "@/components/admin/crm/CrmProductInterestForm";
import CrmRelatedQuotes from "@/components/admin/crm/CrmRelatedQuotes";
import CrmRelatedOrders from "@/components/admin/crm/CrmRelatedOrders";
import {
  CRM_PRIORITY_LABELS,
  CRM_STATUS_LABELS,
  displayLeadCompanyName,
  displayLeadContactName,
} from "@/features/crm/labels";
import { formatCrmCurrency, formatCrmDateTime } from "@/features/crm/format";
import { useAdminMutation } from "@/hooks/useAdminAction";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";
import { useAdminToast } from "@/hooks/useAdminToast";
import { parseAdminJsonResponse } from "@/lib/admin/adminMutation";
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
  const mutate = useAdminMutation();
  const toast = useAdminToast();
  const [lead, setLead] = useState(initialLead);
  const [status, setStatus] = useState<LeadStatus>(initialLead.status);
  const [priority, setPriority] = useState<LeadPriority>(initialLead.priority);
  const [nextFollowUpAt, setNextFollowUpAt] = useState(
    toDatetimeLocalValue(initialLead.nextFollowUpAt ?? initialLead.followUpAt)
  );
  const [note, setNote] = useState(initialLead.note ?? "");
  const [demand, setDemand] = useState(initialLead.demand ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const isLinked = Boolean(lead.customerId);

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
    await mutate({
      loadingMessage: "Đang lưu thông tin…",
      successMessage: "Đã lưu thông tin.",
      action: async () => {
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
        return parseAdminJsonResponse(res, (data) => data.lead as CrmLeadRecord);
      },
      onSuccess: (updatedLead) => {
        setLead(updatedLead);
        router.refresh();
      },
    });
    setSaving(false);
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
        <Link href="/admin/crm/leads" className="admin-btn admin-btn--secondary">
          ← Danh sách lead
        </Link>
      </div>

      {isLinked && lead.customerId && (
        <div className="admin-message admin-message--success">
          <p>
            Lead đã liên kết với khách hàng{" "}
            <strong>
              {lead.customer?.name || "Khách hàng"}
              {lead.customer?.code ? ` (${lead.customer.code})` : ""}
            </strong>
            .{" "}
            <Link href={`/admin/crm/customers/${lead.customerId}`}>Xem khách hàng</Link>
          </p>
        </div>
      )}

      {!isLinked && (
        <CrmConvertLeadPanel
          lead={lead}
          onDone={(updated) => {
            setLead(updated);
            setStatus(updated.status);
            setMessage({ type: "success", text: "Đã cập nhật liên kết khách hàng" });
            router.refresh();
          }}
          onError={(text) => toast.error(text)}
        />
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
            <AdminLoadingButton
              type="button"
              variant="primary"
              pending={saving}
              pendingLabel="Đang lưu thông tin..."
              onClick={() => void saveUpdates()}
            >
              Lưu thay đổi
            </AdminLoadingButton>
          </div>
        </section>

        <section className="admin-section-card">
          <h3>Sản phẩm quan tâm</h3>
          <CrmProductInterestList interests={lead.productInterests ?? []} />
          <hr className="admin-divider" />
          <CrmProductInterestForm leadId={lead.id} onCreated={() => void refreshLead()} />
        </section>
      </div>

      <CrmRelatedQuotes
        leadId={lead.id}
        createHref={`/admin/quotes/new?leadId=${lead.id}`}
      />

      <CrmRelatedOrders leadId={lead.id} />

      <section className="admin-section-card">
        <h3>Hoạt động chăm sóc</h3>
        <CrmLeadTimeline activities={lead.activities ?? []} legacyNotes={lead.notes ?? []} />
        <hr className="admin-divider" />
        <CrmAddActivityForm leadId={lead.id} onCreated={() => void refreshLead()} />
      </section>
    </div>
  );
}
