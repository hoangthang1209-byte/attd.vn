"use client";

import styles from "@/components/admin/content/operations/Operations.module.css";
import type { ActivityGroup } from "@/features/content/operations/content-operations.types";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

type OperationsActivityRailProps = {
  activity: ActivityGroup[];
};

/** Recent editorial activity, deduped — derived from existing SeoTopic updatedAt, no new event log. */
export default function OperationsActivityRail({ activity }: OperationsActivityRailProps) {
  if (activity.length === 0) {
    return <p className="admin-field-hint">Chưa có hoạt động gần đây.</p>;
  }
  return (
    <div>
      {activity.slice(0, 20).map((item) => (
        <div key={item.key} className={styles.activityItem}>
          <span>
            {item.text}
            {item.count > 1 ? ` (×${item.count})` : ""}
          </span>
          <span className={styles.activityTime}>{formatTime(item.at)}</span>
        </div>
      ))}
    </div>
  );
}
