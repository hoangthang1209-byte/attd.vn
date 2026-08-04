"use client";

import styles from "@/components/admin/content/ai-writing/AiWriting.module.css";
import type { AiQueueItem } from "@/components/admin/content/ai-writing/useAiWritingQueue";

function badgeClass(status: AiQueueItem["status"]): string {
  if (status === "RUNNING") return styles.queueBadgeRunning;
  if (status === "COMPLETED") return styles.queueBadgeCompleted;
  if (status === "FAILED") return styles.queueBadgeFailed;
  return styles.queueBadgeWaiting;
}

const STATUS_LABEL_VI: Record<AiQueueItem["status"], string> = {
  RUNNING: "Đang chạy",
  WAITING: "Chờ",
  COMPLETED: "Xong",
  FAILED: "Lỗi",
};

/** Non-blocking queue — editor keeps typing while section generations run in the background. */
export default function AiGenerationQueue({ items, onDismiss }: { items: AiQueueItem[]; onDismiss?: (id: string) => void }) {
  if (items.length === 0) return null;

  return (
    <div className={styles.queue} role="status" aria-label="Hàng đợi tạo AI">
      {items.map((item) => (
        <div key={item.id} className={styles.queueRow}>
          <span>
            {item.sectionHeading} · {item.actionLabel}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className={`${styles.queueBadge} ${badgeClass(item.status)}`}>{STATUS_LABEL_VI[item.status]}</span>
            {onDismiss && (item.status === "COMPLETED" || item.status === "FAILED") && (
              <button
                type="button"
                className="admin-btn admin-btn--secondary admin-btn--xs"
                onClick={() => onDismiss(item.id)}
                aria-label="Ẩn khỏi hàng đợi"
              >
                ×
              </button>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}
