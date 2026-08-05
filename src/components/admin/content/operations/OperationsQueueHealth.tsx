"use client";

import styles from "@/components/admin/content/operations/Operations.module.css";
import type { QueueHealth } from "@/features/content/operations/content-operations.types";

type OperationsQueueHealthProps = {
  health: QueueHealth;
};

/** Compact SLA strip for a single inbox — display only, no drill-down mutation. */
export default function OperationsQueueHealth({ health }: OperationsQueueHealthProps) {
  const entries: Array<{ key: string; label: string; value: number; tone?: "warn" | "danger" }> = [
    { key: "total", label: "Tổng", value: health.total },
    { key: "waiting", label: "Đang chờ", value: health.waiting },
    { key: "overdue", label: "Quá hạn", value: health.overdue, tone: health.overdue > 0 ? "danger" : undefined },
    { key: "blocked", label: "Chặn", value: health.blocked, tone: health.blocked > 0 ? "warn" : undefined },
    { key: "completedToday", label: "Xong hôm nay", value: health.completedToday },
  ];

  return (
    <div className={styles.queueHealthStrip} role="group" aria-label="Sức khỏe hàng đợi">
      {entries.map((entry) => (
        <div
          key={entry.key}
          className={`${styles.queueHealthItem} ${entry.tone === "danger" ? styles.queueHealthItemDanger : ""} ${entry.tone === "warn" ? styles.queueHealthItemWarn : ""}`}
        >
          <span className={styles.queueHealthValue}>{entry.value}</span>
          <span className={styles.queueHealthLabel}>{entry.label}</span>
        </div>
      ))}
    </div>
  );
}
