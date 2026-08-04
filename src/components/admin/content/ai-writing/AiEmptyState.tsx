"use client";

import styles from "@/components/admin/content/ai-writing/AiWriting.module.css";

type Props = { reason?: string };

/** Shown wherever AI is off/not configured — writing must never feel blocked. */
export default function AiEmptyState({ reason }: Props) {
  return (
    <p className={styles.emptyState}>
      {reason ?? "AI chưa được cấu hình. Bạn vẫn có thể tiếp tục viết bài bình thường."}
    </p>
  );
}
