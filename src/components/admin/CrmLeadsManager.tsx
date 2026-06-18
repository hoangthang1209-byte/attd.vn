"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { LeadPriority, LeadSource, LeadStatus } from "@prisma/client";
import CrmFollowUpWidget from "@/components/admin/CrmFollowUpWidget";
import LeadPriorityBadge from "@/components/admin/LeadPriorityBadge";
import LeadSourceDisplay from "@/components/admin/LeadSourceDisplay";
import LeadStatusBadge from "@/components/admin/LeadStatusBadge";
import { CRM_PRIORITY_LABELS, CRM_SOURCE_LABELS, CRM_STATUS_LABELS, displayLeadCompanyName, displayLeadContactName } from "@/features/crm/labels";
import { formatCrmCurrency, formatCrmDateTime } from "@/features/crm/format";
import {
  CRM_LEAD_PRIORITIES,
  CRM_LEAD_SOURCES,
  CRM_LEAD_STATUSES,
  type CrmLeadKpis,
  type CrmLeadRecord,
  type CrmLeadReminders,
  type CrmLeadValueKpis,
} from "@/features/crm/types";

type LoadState = "loading" | "error" | "empty" | "ready";

export default function CrmLeadsManager() {
  const router = useRouter();
  const [leads, setLeads] = useState<CrmLeadRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [kpis, setKpis] = useState<CrmLeadKpis | null>(null);
  const [valueKpis, setValueKpis] = useState<CrmLeadValueKpis | null>(null);
  const [reminders, setReminders] = useState<CrmLeadReminders | null>(null);
  const [tableReady, setTableReady] = useState(true);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<LeadSource | "">("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "">("");
  const [priorityFilter, setPriorityFilter] = useState<LeadPriority | "">("");

  const load = useCallback(async () => {
    setLoadState("loading");
    setErrorMessage(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (sourceFilter) params.set("source", sourceFilter);
      if (statusFilter) params.set("status", statusFilter);
      if (priorityFilter) params.set("priority", priorityFilter);

      const res = await fetch(`/api/crm/leads?${params.toString()}`);
      const data = await res.json();

      setTableReady(data.tableReady !== false);

      if (!res.ok || data.error) {
        const detail = data.error ?? data.message ?? `HTTP ${res.status}`;
        setErrorMessage(detail);
        setLeads([]);
        setKpis(null);
        setValueKpis(null);
        setReminders(null);
        setLoadState("error");
        return;
      }

      const nextLeads = Array.isArray(data.leads) ? data.leads : [];
      setLeads(nextLeads);
      setTotal(typeof data.total === "number" ? data.total : nextLeads.length);
      setKpis(data.kpis ?? null);
      setValueKpis(data.valueKpis ?? null);
      setReminders(data.reminders ?? null);
      setLoadState(nextLeads.length === 0 ? "empty" : "ready");
    } catch (err) {
      const detail = err instanceof Error ? err.message : "Không thể tải dữ liệu CRM";
      setErrorMessage(detail);
      setLeads([]);
      setKpis(null);
      setValueKpis(null);
      setReminders(null);
      setLoadState("error");
    }
  }, [search, sourceFilter, statusFilter, priorityFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  function applyFilters(event: React.FormEvent) {
    event.preventDefault();
    void load();
  }

  function openLead(id: string) {
    router.push(`/admin/crm/leads/${id}`);
  }

  return (
    <div className="admin-panel">
      <div className="admin-section-header">
        <p>Tổng: {total} lead</p>
        <Link href="/admin/crm/leads/new" className="admin-btn admin-btn--primary">
          Thêm lead
        </Link>
      </div>
      {!tableReady && loadState !== "loading" && (
        <p className="admin-message admin-message--error" role="alert">
          Bảng CRM chưa sẵn sàng. Chạy{" "}
          <code>npx prisma migrate deploy</code>.
        </p>
      )}

      {loadState === "error" && errorMessage && (
        <div className="admin-empty-state admin-empty-state--error">
          <p>Không thể tải dữ liệu CRM</p>
          <p className="admin-empty-hint">{errorMessage}</p>
          <button type="button" className="admin-btn" onClick={() => void load()}>
            Thử lại
          </button>
        </div>
      )}

      {loadState === "loading" && <p className="admin-loading">Đang tải...</p>}

      {loadState !== "loading" && loadState !== "error" && reminders && (
        <CrmFollowUpWidget
          dueTodayLeads={reminders.dueTodayLeads}
          overdueLeads={reminders.overdueLeads}
        />
      )}

      {loadState !== "loading" && loadState !== "error" && kpis && (
        <div className="admin-crm-kpi-grid">
          {CRM_LEAD_STATUSES.map((status) => (
            <div key={status} className="admin-dashboard-card">
              <p className="admin-dashboard-label">{CRM_STATUS_LABELS[status]}</p>
              <p className="admin-dashboard-value">{kpis[status] ?? 0}</p>
            </div>
          ))}
        </div>
      )}

      {loadState !== "loading" && loadState !== "error" && valueKpis && (
        <div className="admin-crm-reminder-grid">
          <div className="admin-dashboard-card">
            <p className="admin-dashboard-label">Pipeline Value</p>
            <p className="admin-dashboard-value">
              {formatCrmCurrency(valueKpis.pipelineTotal)}
            </p>
          </div>
          <div className="admin-dashboard-card admin-dashboard-card--success">
            <p className="admin-dashboard-label">Won Value</p>
            <p className="admin-dashboard-value">{formatCrmCurrency(valueKpis.wonTotal)}</p>
          </div>
        </div>
      )}

      {loadState !== "loading" && loadState !== "error" && (
        <form className="admin-crm-filters" onSubmit={applyFilters}>
          <input
            type="search"
            placeholder="Tìm tên, SĐT, email, công ty..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="admin-input"
          />
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value as LeadSource | "")}
            className="admin-input"
          >
            <option value="">Tất cả nguồn</option>
            {CRM_LEAD_SOURCES.map((source) => (
              <option key={source} value={source}>
                {CRM_SOURCE_LABELS[source]}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as LeadStatus | "")}
            className="admin-input"
          >
            <option value="">Tất cả trạng thái</option>
            {CRM_LEAD_STATUSES.map((status) => (
              <option key={status} value={status}>
                {CRM_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as LeadPriority | "")}
            className="admin-input"
          >
            <option value="">Tất cả ưu tiên</option>
            {CRM_LEAD_PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {CRM_PRIORITY_LABELS[priority]}
              </option>
            ))}
          </select>
          <button type="submit" className="admin-btn">
            Lọc
          </button>
        </form>
      )}

      {loadState === "empty" && (
        <div className="admin-empty-state">
          <p>Chưa có lead nào</p>
          <Link href="/admin/crm/leads/new" className="admin-btn admin-btn--primary">
            Thêm lead
          </Link>
        </div>
      )}

      {loadState === "ready" && (
        <div className="admin-table-wrap admin-table-wrap--crm">
          <table className="admin-table admin-table--crm">
            <thead>
              <tr>
                <th>Mã lead</th>
                <th>Công ty</th>
                <th>Người liên hệ</th>
                <th>SĐT</th>
                <th>Nhu cầu</th>
                <th>Nguồn</th>
                <th>Trạng thái</th>
                <th>Ưu tiên</th>
                <th>Khách hàng</th>
                <th>Follow-up</th>
                <th>Ngày tạo</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr
                  key={lead.id}
                  className="admin-crm-row"
                  onClick={() => openLead(lead.id)}
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openLead(lead.id);
                    }
                  }}
                >
                  <td>{lead.code || "—"}</td>
                  <td>{displayLeadCompanyName(lead) || "—"}</td>
                  <td>{displayLeadContactName(lead)}</td>
                  <td>{lead.phone}</td>
                  <td className="admin-table-cell-truncate">
                    {lead.demand || lead.message || "—"}
                  </td>
                  <td>
                    <LeadSourceDisplay lead={lead} />
                  </td>
                  <td>
                    <LeadStatusBadge status={lead.status} />
                  </td>
                  <td>
                    <LeadPriorityBadge priority={lead.priority} />
                  </td>
                  <td>
                    {lead.customer ? (
                      <Link
                        href={`/admin/crm/customers/${lead.customer.id}`}
                        className="admin-crm-row-link"
                        onClick={(event) => event.stopPropagation()}
                      >
                        {lead.customer.code} — {lead.customer.name}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>{formatCrmDateTime(lead.nextFollowUpAt ?? lead.followUpAt)}</td>
                  <td>{formatCrmDateTime(lead.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
