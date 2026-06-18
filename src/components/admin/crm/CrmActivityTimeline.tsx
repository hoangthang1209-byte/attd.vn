"use client";

import type { CRMActivityType } from "@prisma/client";
import { CRM_ACTIVITY_TYPE_LABELS } from "@/features/crm/labels";
import { formatCrmDateTime } from "@/features/crm/format";
import type { CrmActivityRecord } from "@/features/crm/types";

export default function CrmActivityTimeline({
  activities,
  emptyMessage = "Chưa có hoạt động chăm sóc",
}: {
  activities: CrmActivityRecord[];
  emptyMessage?: string;
}) {
  if (activities.length === 0) {
    return (
      <div className="admin-empty-state admin-empty-state--compact">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <ul className="admin-crm-timeline">
      {activities.map((activity) => (
        <li key={activity.id} className="admin-crm-timeline-item">
          <div className="admin-crm-timeline-meta">
            <span className="admin-badge">
              {CRM_ACTIVITY_TYPE_LABELS[activity.type as CRMActivityType]}
            </span>
            <time>{formatCrmDateTime(activity.createdAt)}</time>
          </div>
          <p className="admin-crm-timeline-title">{activity.title}</p>
          {activity.content && (
            <p className="admin-crm-timeline-content">{activity.content}</p>
          )}
          {activity.outcome && (
            <p className="admin-crm-timeline-outcome">Kết quả: {activity.outcome}</p>
          )}
          {activity.nextFollowUpAt && (
            <p className="admin-crm-timeline-followup">
              Follow-up: {formatCrmDateTime(activity.nextFollowUpAt)}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
