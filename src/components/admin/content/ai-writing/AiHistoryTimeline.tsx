"use client";

import styles from "@/components/admin/content/ai-writing/AiWriting.module.css";
import type { SafeProposalSummary } from "@/features/content-generation/services/history.service";

export type AiHistoryTimelineItem = SafeProposalSummary & { output?: unknown };

type Props = {
  items: AiHistoryTimelineItem[];
  onOpenDiff?: (item: AiHistoryTimelineItem) => void;
};

const STAGE_LABEL_VI: Record<string, string> = {
  REQUESTED: "Đã yêu cầu",
  RUNNING: "Đang tạo",
  GENERATED: "Đã tạo",
  VALIDATION_FAILED: "Kiểm tra thất bại",
  APPLIED: "Đã áp dụng",
  EDITED_AND_APPLIED: "Đã sửa & áp dụng",
  REJECTED: "Đã từ chối",
  FAILED: "Thất bại",
  CANCELLED: "Đã huỷ",
};

function formatDate(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });
}

/** Generated → Edited → Applied timeline built from `/api/content/generation/history` items. */
export default function AiHistoryTimeline({ items, onOpenDiff }: Props) {
  if (items.length === 0) {
    return <p className="admin-field-hint">Chưa có lịch sử đề xuất AI.</p>;
  }

  return (
    <ul className={styles.timeline} style={{ listStyle: "none", paddingLeft: 0, margin: 0 }}>
      {items.map((item) => (
        <li key={item.id} className={styles.timelineItem}>
          <span>
            <strong>{STAGE_LABEL_VI[item.proposalStatus ?? item.status] ?? item.proposalStatus ?? item.status}</strong>{" "}
            · {item.type}
            {item.sectionId ? ` · section ${item.sectionId.slice(0, 8)}…` : ""}
            <br />
            <span className={styles.timelineMeta}>
              {formatDate(item.createdAt)}
              {item.appliedAt ? ` · applied ${formatDate(item.appliedAt)}` : ""}
              {item.rejectedAt ? ` · rejected ${formatDate(item.rejectedAt)}` : ""}
            </span>
          </span>
          {onOpenDiff && item.output != null && (
            <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" onClick={() => onOpenDiff(item)}>
              Xem diff
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
