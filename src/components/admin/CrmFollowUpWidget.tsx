"use client";

import Link from "next/link";
import LeadStatusBadge from "@/components/admin/LeadStatusBadge";
import { formatCrmDateTime } from "@/features/crm/format";
import type { CrmLeadRecord } from "@/features/crm/types";

type FollowUpItem = CrmLeadRecord & { overdue?: boolean };

export default function CrmFollowUpWidget({
  dueTodayLeads,
  overdueLeads,
}: {
  dueTodayLeads: CrmLeadRecord[];
  overdueLeads: CrmLeadRecord[];
}) {
  const items: FollowUpItem[] = [
    ...overdueLeads.map((lead) => ({ ...lead, overdue: true })),
    ...dueTodayLeads.map((lead) => ({ ...lead, overdue: false })),
  ];

  return (
    <section className="admin-crm-today">
      <h2 className="admin-subtitle">Việc cần làm hôm nay</h2>

      {items.length === 0 ? (
        <div className="admin-empty-state admin-empty-state--compact">
          <p>Không có lịch follow-up hôm nay</p>
        </div>
      ) : (
        <ul className="admin-crm-today-list">
          {items.map((lead) => (
            <li key={lead.id} className={lead.overdue ? "is-overdue" : undefined}>
              <div className="admin-crm-today-main">
                <Link href={`/admin/crm/${lead.id}`} className="admin-crm-today-name">
                  {lead.fullName}
                </Link>
                <LeadStatusBadge status={lead.status} />
              </div>
              <div className="admin-crm-today-meta">
                <span>{lead.phone}</span>
                <span>{formatCrmDateTime(lead.followUpAt)}</span>
                {lead.overdue && <span className="admin-crm-today-tag">Quá hạn</span>}
              </div>
              <Link href={`/admin/crm/${lead.id}`} className="admin-link-button admin-crm-today-open">
                Mở
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
