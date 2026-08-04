"use client";

import styles from "@/components/admin/content/ai-writing/AiWriting.module.css";

type Props = { lines?: number; label?: string };

/** Skeleton lines only — never a page-level spinner (writing surface must stay usable). */
export default function AiLoadingSkeleton({ lines = 3, label = "AI đang soạn đề xuất…" }: Props) {
  return (
    <div className={styles.skeleton} role="status" aria-label={label}>
      {Array.from({ length: lines }).map((_, idx) => (
        <div key={idx} className={styles.skeletonLine} style={{ width: idx === lines - 1 ? "60%" : "100%" }} />
      ))}
      <span className={styles.typingIndicator}>
        <span className={styles.typingDot} />
        <span className={styles.typingDot} />
        <span className={styles.typingDot} />
        {label}
      </span>
    </div>
  );
}
