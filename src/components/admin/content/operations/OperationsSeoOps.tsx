"use client";

import styles from "@/components/admin/content/operations/Operations.module.css";
import type { SeoOpsSummary } from "@/features/content/operations/content-operations.types";

type OperationsSeoOpsProps = {
  summary: SeoOpsSummary;
};

/** SEO metadata completeness across active topics — display-only. */
export default function OperationsSeoOps({ summary }: OperationsSeoOpsProps) {
  const rows: Array<{ label: string; count: number }> = [
    { label: "Thiếu Meta Title", count: summary.missingMetaTitle },
    { label: "Thiếu Meta Description", count: summary.missingMetaDescription },
    { label: "Thiếu Slug", count: summary.missingSlug },
    { label: "Thiếu từ khóa chính", count: summary.missingPrimaryKeyword },
  ];
  return (
    <div className={styles.healthGrid}>
      {rows.map((row) => (
        <div key={row.label} className={styles.healthCard} style={{ cursor: "default" }}>
          <div className={styles.healthCount}>{row.count}</div>
          <div className={styles.healthLabel}>{row.label}</div>
        </div>
      ))}
      <div className={styles.healthCard} style={{ cursor: "default" }}>
        <div className={styles.healthCount}>{summary.totalTopics}</div>
        <div className={styles.healthLabel}>Tổng chủ đề đang hoạt động</div>
      </div>
    </div>
  );
}
