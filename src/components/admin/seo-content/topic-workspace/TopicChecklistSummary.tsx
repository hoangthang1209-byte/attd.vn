"use client";

import styles from "@/components/admin/seo-content/topic-workspace/TopicWorkspace.module.css";
import type { ChecklistGroupSummary } from "@/features/content/editorial/editorial-ux";

const TONE_CLASS: Record<ChecklistGroupSummary["tone"], string> = {
  complete: styles.checklistCardComplete,
  needs_attention: styles.checklistCardNeedsAttention,
  blocked: styles.checklistCardBlocked,
};

/** Compact 5-group readiness (Nội dung / SEO / Hình ảnh / Kiểm duyệt / Xuất bản). */
export default function TopicChecklistSummary({ groups }: { groups: ChecklistGroupSummary[] }) {
  return (
    <div className={styles.checklistGrid}>
      {groups.map((group) => (
        <div key={group.key} className={`${styles.checklistCard} ${TONE_CLASS[group.tone]}`}>
          <p className={styles.checklistCardLabel}>{group.label}</p>
          <p className={styles.checklistCardValue}>
            {group.done}/{group.total}
          </p>
        </div>
      ))}
    </div>
  );
}
