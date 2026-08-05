"use client";

import styles from "@/components/admin/content/operations/Operations.module.css";
import type { KnowledgeCoverageSummary } from "@/features/content/operations/content-operations.types";

type OperationsKnowledgeCoverageProps = {
  summary: KnowledgeCoverageSummary;
};

/**
 * Knowledge-path proxy: an approved Brief is the existing signal that a topic
 * has a governed knowledge path. This never calls Knowledge Graph / AI.
 */
export default function OperationsKnowledgeCoverage({ summary }: OperationsKnowledgeCoverageProps) {
  return (
    <div className={styles.healthGrid}>
      <div className={styles.healthCard} style={{ cursor: "default" }}>
        <div className={styles.healthCount}>{summary.withBriefApproved}</div>
        <div className={styles.healthLabel}>Có Brief đã duyệt</div>
      </div>
      <div className={styles.healthCard} style={{ cursor: "default" }}>
        <div className={styles.healthCount}>{summary.missingBrief}</div>
        <div className={styles.healthLabel}>Thiếu Brief đã duyệt</div>
      </div>
      <div className={styles.healthCard} style={{ cursor: "default" }}>
        <div className={styles.healthCount}>{summary.totalTopics}</div>
        <div className={styles.healthLabel}>Tổng chủ đề</div>
      </div>
    </div>
  );
}
