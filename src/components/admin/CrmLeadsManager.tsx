"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { LeadSource, LeadStatus } from "@prisma/client";
import {
  CRM_SOURCE_LABELS,
  CRM_STATUS_LABELS,
} from "@/features/crm/labels";
import {
  CRM_LEAD_SOURCES,
  CRM_LEAD_STATUSES,
  type CrmLeadKpis,
  type CrmLeadRecord,
  type CrmLeadReminders,
} from "@/features/crm/types";

function formatDateTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CrmLeadsManager() {
  const [leads, setLeads] = useState<CrmLeadRecord[]>([]);
  const [kpis, setKpis] = useState<CrmLeadKpis | null>(null);
  const [reminders, setReminders] = useState<CrmLeadReminders | null>(null);
  const [tableReady, setTableReady] = useState(true);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<LeadSource | "">("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "">("");
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(
    null
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (sourceFilter) params.set("source", sourceFilter);
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/crm/leads?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.message ?? "Không thể tải CRM leads" });
        return;
      }

      setTableReady(data.tableReady !== false);
      setLeads(Array.isArray(data.leads) ? data.leads : []);
      setKpis(data.kpis ?? null);
      setReminders(data.reminders ?? null);
    } catch {
      setMessage({ type: "error", text: "Không thể tải CRM leads" });
    } finally {
      setLoading(false);
    }
  }, [search, sourceFilter, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  function applyFilters(event: React.FormEvent) {
    event.preventDefault();
    void load();
  }

  return (
    <div className="admin-panel">
      {!tableReady && (
        <p className="admin-message admin-message--error" role="alert">
          Bảng CRM chưa sẵn sàng. Chạy{" "}
          <code>npx prisma migrate deploy</code>.
        </p>
      )}

      {message && (
        <p className={`admin-message admin-message--${message.type}`}>{message.text}</p>
      )}

      {kpis && (
        <div className="admin-crm-kpi-grid">
          {CRM_LEAD_STATUSES.map((status) => (
            <div key={status} className="admin-dashboard-card">
              <p className="admin-dashboard-label">{CRM_STATUS_LABELS[status]}</p>
              <p className="admin-dashboard-value">{kpis[status] ?? 0}</p>
            </div>
          ))}
        </div>
      )}

      {reminders && (
        <div className="admin-crm-reminder-grid">
          <div className="admin-dashboard-card admin-dashboard-card--warning">
            <p className="admin-dashboard-label">Lead cần follow-up hôm nay</p>
            <p className="admin-dashboard-value">{reminders.dueToday}</p>
          </div>
          <div className="admin-dashboard-card admin-dashboard-card--danger">
            <p className="admin-dashboard-label">Lead quá hạn follow-up</p>
            <p className="admin-dashboard-value">{reminders.overdue}</p>
          </div>
        </div>
      )}

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
        <button type="submit" className="admin-btn">
          Lọc
        </button>
      </form>

      {loading ? (
        <p className="admin-loading">Đang tải...</p>
      ) : leads.length === 0 ? (
        <div className="admin-empty-state">
          <p>Chưa có lead nào.</p>
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Tên</th>
                <th>SĐT</th>
                <th>Email</th>
                <th>C ty</th>
                <th>Nguồn</th>
                <th>Trạng thái</th>
                <th>Follow-up</th>
                <th>Ngày tạo</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id}>
                  <td>{lead.fullName}</td>
                  <td>{lead.phone}</td>
                  <td>{lead.email || "—"}</td>
                  <td>{lead.company || "—"}</td>
                  <td>{CRM_SOURCE_LABELS[lead.source]}</td>
                  <td>{CRM_STATUS_LABELS[lead.status]}</td>
                  <td>{formatDateTime(lead.followUpAt)}</td>
                  <td>{formatDateTime(lead.createdAt)}</td>
                  <td>
                    <Link href={`/admin/crm/${lead.id}`}>Chi tiết</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
