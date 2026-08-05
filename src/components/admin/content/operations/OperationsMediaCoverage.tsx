"use client";

import Link from "next/link";
import styles from "@/components/admin/content/operations/Operations.module.css";
import type { MediaCoverageSummary } from "@/features/content/operations/content-operations.types";

type OperationsMediaCoverageProps = {
  summary: MediaCoverageSummary;
};

/** Media bundle coverage snapshot — deep link goes to the existing Media Coverage workspace. */
export default function OperationsMediaCoverage({ summary }: OperationsMediaCoverageProps) {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div className={styles.healthGrid}>
        <div className={styles.healthCard} style={{ cursor: "default" }}>
          <div className={styles.healthCount}>{summary.missingBundle}</div>
          <div className={styles.healthLabel}>Thiếu bộ hình</div>
        </div>
        <div className={styles.healthCard} style={{ cursor: "default" }}>
          <div className={styles.healthCount}>{summary.criticalStatus}</div>
          <div className={styles.healthLabel}>Trạng thái Critical</div>
        </div>
        <div className={styles.healthCard} style={{ cursor: "default" }}>
          <div className={styles.healthCount}>{summary.averageScore ?? "—"}</div>
          <div className={styles.healthLabel}>Điểm media trung bình</div>
        </div>
        <div className={styles.healthCard} style={{ cursor: "default" }}>
          <div className={styles.healthCount}>{summary.totalTopics}</div>
          <div className={styles.healthLabel}>Tổng chủ đề</div>
        </div>
      </div>
      <Link href="/admin/content/media-coverage" className="admin-btn admin-btn--secondary admin-btn--small" style={{ width: "fit-content" }}>
        Mở Độ phủ hình ảnh
      </Link>
    </div>
  );
}
