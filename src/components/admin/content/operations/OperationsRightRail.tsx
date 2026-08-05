"use client";

import Link from "next/link";
import styles from "@/components/admin/content/operations/Operations.module.css";
import OperationsActivityRail from "@/components/admin/content/operations/OperationsActivityRail";
import type {
  ActivityGroup,
  OperationsPipelineSummaryEntry,
  PublishQueueSummary,
  ReviewQueueSummary,
} from "@/features/content/operations/content-operations.types";

type OperationsRightRailProps = {
  pipeline: OperationsPipelineSummaryEntry[];
  reviewQueue: ReviewQueueSummary;
  publishQueue: PublishQueueSummary;
  activity: ActivityGroup[];
  dueTodayCount: number;
  overdueCount: number;
};

/** Compact "at a glance" rail: today, pipeline mini, queues, recent activity. */
export default function OperationsRightRail({
  pipeline,
  reviewQueue,
  publishQueue,
  activity,
  dueTodayCount,
  overdueCount,
}: OperationsRightRailProps) {
  return (
    <aside className={styles.rail} aria-label="Tổng hợp nhanh">
      <div className={styles.railCard}>
        <h3 className={styles.railTitle}>Hôm nay</h3>
        <div className={styles.railRow}>
          <span>Đến hạn hôm nay</span>
          <span className={styles.railCount}>{dueTodayCount}</span>
        </div>
        <div className={styles.railRow}>
          <span>Quá hạn</span>
          <span className={styles.railCount}>{overdueCount}</span>
        </div>
      </div>

      <div className={styles.railCard}>
        <h3 className={styles.railTitle}>Pipeline</h3>
        {pipeline.map((entry) => (
          <div key={entry.key} className={styles.railRow}>
            <span>{entry.label}</span>
            <span className={styles.railCount}>{entry.count}</span>
          </div>
        ))}
      </div>

      <div className={styles.railCard}>
        <h3 className={styles.railTitle}>Hàng đợi</h3>
        <div className={styles.railRow}>
          <span>Kiểm duyệt</span>
          <Link href="/admin/content/reviews" className={styles.railCount} style={{ textDecoration: "none" }}>
            {reviewQueue.inReviewCount + reviewQueue.changesRequestedCount}
          </Link>
        </div>
        <div className={styles.railRow}>
          <span>Xuất bản</span>
          <Link href="/admin/content/publishing" className={styles.railCount} style={{ textDecoration: "none" }}>
            {publishQueue.readyCount + publishQueue.scheduledCount}
          </Link>
        </div>
      </div>

      <div className={styles.railCard}>
        <h3 className={styles.railTitle}>Hoạt động gần đây</h3>
        <OperationsActivityRail activity={activity.slice(0, 8)} />
      </div>
    </aside>
  );
}
