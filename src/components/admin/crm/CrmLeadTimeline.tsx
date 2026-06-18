"use client";

import type { CRMActivityType } from "@prisma/client";
import { CRM_ACTIVITY_TYPE_LABELS } from "@/features/crm/labels";
import { formatCrmDateTime } from "@/features/crm/format";
import type { CrmActivityRecord, CrmLeadNoteRecord } from "@/features/crm/types";

export type CrmTimelineItem =
  | {
      kind: "activity";
      id: string;
      createdAt: string;
      activity: CrmActivityRecord;
    }
  | {
      kind: "legacy-note";
      id: string;
      createdAt: string;
      note: CrmLeadNoteRecord;
    };

export function buildLeadTimelineItems(
  activities: CrmActivityRecord[],
  legacyNotes: CrmLeadNoteRecord[]
): CrmTimelineItem[] {
  const items: CrmTimelineItem[] = [
    ...activities.map((activity) => ({
      kind: "activity" as const,
      id: `activity-${activity.id}`,
      createdAt: activity.createdAt,
      activity,
    })),
    ...legacyNotes.map((note) => ({
      kind: "legacy-note" as const,
      id: `legacy-${note.id}`,
      createdAt: note.createdAt,
      note,
    })),
  ];

  return items.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export default function CrmLeadTimeline({
  activities,
  legacyNotes = [],
}: {
  activities: CrmActivityRecord[];
  legacyNotes?: CrmLeadNoteRecord[];
}) {
  const items = buildLeadTimelineItems(activities, legacyNotes);

  if (items.length === 0) {
    return (
      <div className="admin-empty-state admin-empty-state--compact">
        <p>Chưa có hoạt động chăm sóc</p>
        <p className="admin-empty-hint">Thêm hoạt động đầu tiên</p>
      </div>
    );
  }

  return (
    <div>
      <h4 className="admin-crm-timeline-heading">Lịch sử chăm sóc</h4>
      <ul className="admin-crm-timeline">
        {items.map((item) => {
          if (item.kind === "legacy-note") {
            return (
              <li key={item.id} className="admin-crm-timeline-item admin-crm-timeline-item--legacy">
                <div className="admin-crm-timeline-meta">
                  <span className="admin-badge admin-badge--legacy">Ghi chú cũ</span>
                  <time>{formatCrmDateTime(item.createdAt)}</time>
                </div>
                <p className="admin-crm-timeline-content">{item.note.content}</p>
              </li>
            );
          }

          const activity = item.activity;
          return (
            <li key={item.id} className="admin-crm-timeline-item">
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
          );
        })}
      </ul>
    </div>
  );
}
