"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import LeadStatusBadge from "@/components/admin/LeadStatusBadge";
import CrmActivityTimeline from "@/components/admin/crm/CrmActivityTimeline";
import { displayLeadCompanyName, displayLeadContactName } from "@/features/crm/labels";
import { formatCrmDateTime } from "@/features/crm/format";
import type { CrmOverviewMetrics } from "@/features/crm/types";

export default function CrmOverviewDashboard() {
  const [data, setData] = useState<CrmOverviewMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/crm/overview")
      .then((res) => res.json())
      .then((json) => {
        if (json.message && !json.recentLeads) {
          setError(json.message);
          return;
        }
        setData(json as CrmOverviewMetrics);
      })
      .catch(() => setError("Không thể tải tổng quan CRM"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="admin-loading">Đang tải...</p>;
  if (error) {
    return (
      <div className="admin-empty-state admin-empty-state--error">
        <p>{error}</p>
      </div>
    );
  }
  if (!data) return null;

  const cards = [
    { label: "Lead mới", value: data.newLeads, href: "/admin/crm/leads?status=NEW" },
    {
      label: "Lead cần chăm sóc",
      value: data.leadsNeedCare,
      href: "/admin/crm/leads",
    },
    {
      label: "Lead cần tính giá",
      value: data.leadsNeedPricing,
      href: "/admin/crm/leads?status=NEED_PRICING",
    },
    {
      label: "Khách hàng tiềm năng",
      value: data.prospectCustomers,
      href: "/admin/crm/customers?status=PROSPECT",
    },
    {
      label: "Khách hàng đang hoạt động",
      value: data.activeCustomers,
      href: "/admin/crm/customers?status=ACTIVE",
    },
  ];

  return (
    <div className="admin-panel">
      <div className="admin-crm-kpi-grid">
        {cards.map((card) => (
          <Link key={card.label} href={card.href} className="admin-dashboard-card admin-dashboard-card--link">
            <p className="admin-dashboard-label">{card.label}</p>
            <p className="admin-dashboard-value">{card.value}</p>
          </Link>
        ))}
      </div>

      <div className="admin-crm-overview-grid">
        <section className="admin-section-card">
          <div className="admin-section-header">
            <h2>Lead gần đây</h2>
            <Link href="/admin/crm/leads" className="admin-link-button">
              Xem tất cả
            </Link>
          </div>
          {data.recentLeads.length === 0 ? (
            <div className="admin-empty-state admin-empty-state--compact">
              <p>Chưa có lead nào</p>
              <Link href="/admin/crm/leads/new" className="admin-btn admin-btn--primary admin-btn--sm">
                Thêm lead
              </Link>
            </div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Mã</th>
                    <th>Công ty / Liên hệ</th>
                    <th>Trạng thái</th>
                    <th>Ngày tạo</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentLeads.map((lead) => (
                    <tr
                      key={lead.id}
                      className="admin-crm-row"
                      onClick={() => {
                        window.location.href = `/admin/crm/leads/${lead.id}`;
                      }}
                    >
                      <td>{lead.code || "—"}</td>
                      <td>
                        {displayLeadCompanyName(lead) || displayLeadContactName(lead)}
                      </td>
                      <td>
                        <LeadStatusBadge status={lead.status} />
                      </td>
                      <td>{formatCrmDateTime(lead.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="admin-section-card">
          <div className="admin-section-header">
            <h2>Hoạt động gần đây</h2>
          </div>
          <CrmActivityTimeline
            activities={data.recentActivities}
            emptyMessage="Chưa có hoạt động chăm sóc"
          />
        </section>
      </div>
    </div>
  );
}
