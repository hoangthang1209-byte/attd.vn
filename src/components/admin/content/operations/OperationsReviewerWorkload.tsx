"use client";

import { useCallback, useEffect, useState } from "react";
import styles from "@/components/admin/content/operations/Operations.module.css";
import { AdminLoadingState, EmptyState } from "@/components/admin/AdminUi";
import { buildReviewerWorkload } from "@/features/content/operations/content-operations.mapping";
import type { ReviewerWorkload, ReviewInbox } from "@/features/content/operations/content-operations.types";

/**
 * Per-reviewer workload snapshot. Fetches its own bounded review inbox on
 * mount (lazy — only when this section is opened) and aggregates
 * client-side; no reassignment action lives here.
 */
export default function OperationsReviewerWorkload() {
  const [reviewers, setReviewers] = useState<ReviewerWorkload[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setReviewers(null);
    try {
      const res = await fetch("/api/content/operations/reviews", { cache: "no-store" });
      const json = (await res.json()) as { inbox?: ReviewInbox; message?: string };
      if (!res.ok || !json.inbox) throw new Error(json.message ?? "Không tải được tải trọng người duyệt");
      setReviewers(buildReviewerWorkload(json.inbox.items));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được tải trọng người duyệt");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (reviewers === null && !error) return <AdminLoadingState label="Đang tải tải trọng người duyệt…" rows={3} />;
  if (error) {
    return (
      <EmptyState
        compact
        tone="error"
        title="Không tải được tải trọng người duyệt"
        description={error}
        action={
          <button type="button" className="admin-btn admin-btn--primary admin-btn--small" onClick={() => void load()}>
            Thử lại
          </button>
        }
      />
    );
  }
  if (!reviewers || reviewers.length === 0) {
    return <EmptyState compact title="Chưa có dữ liệu người duyệt" description="Không có phiên kiểm duyệt nào đang mở." />;
  }
  return (
    <div className={styles.rowsTable}>
      <div className={styles.rowsHeader}>
        <span>Người duyệt</span>
        <span>Đang duyệt</span>
        <span>Yêu cầu sửa</span>
        <span>Blocking</span>
      </div>
      {reviewers.map((reviewer) => (
        <div key={reviewer.reviewerId} className={styles.rowItem}>
          <div className={styles.rowName}>{reviewer.reviewerId}</div>
          <span>{reviewer.inReviewCount}</span>
          <span>{reviewer.changesRequestedCount}</span>
          <span>{reviewer.blockingIssuesTotal}</span>
        </div>
      ))}
    </div>
  );
}
