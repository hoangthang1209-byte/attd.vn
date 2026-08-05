"use client";

import { useCallback, useEffect, useState } from "react";
import styles from "@/components/admin/content/operations/Operations.module.css";
import { AdminLoadingState, EmptyState } from "@/components/admin/AdminUi";
import { buildEditorWorkload } from "@/features/content/operations/content-operations.mapping";
import type { EditorWorkload, OpsTopicCard, ReviewInbox } from "@/features/content/operations/content-operations.types";

type OperationsEditorLoadProps = {
  /** Already-loaded command-center topics — reused, not refetched. */
  topics: OpsTopicCard[];
};

/**
 * Combined drafting + review load per editor/reviewer. `topics` come from
 * the already-fetched command-center summary; only the review inbox is
 * fetched here (lazy, on section open).
 */
export default function OperationsEditorLoad({ topics }: OperationsEditorLoadProps) {
  const [editors, setEditors] = useState<EditorWorkload[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setEditors(null);
    try {
      const res = await fetch("/api/content/operations/reviews", { cache: "no-store" });
      const json = (await res.json()) as { inbox?: ReviewInbox; message?: string };
      if (!res.ok || !json.inbox) throw new Error(json.message ?? "Không tải được tải công việc");
      setEditors(buildEditorWorkload(topics, json.inbox.items));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được tải công việc");
    }
  }, [topics]);

  useEffect(() => {
    void load();
  }, [load]);

  if (editors === null && !error) return <AdminLoadingState label="Đang tải tải công việc…" rows={3} />;
  if (error) {
    return (
      <EmptyState
        compact
        tone="error"
        title="Không tải được tải công việc"
        description={error}
        action={
          <button type="button" className="admin-btn admin-btn--primary admin-btn--small" onClick={() => void load()}>
            Thử lại
          </button>
        }
      />
    );
  }
  if (!editors || editors.length === 0) {
    return <EmptyState compact title="Chưa có dữ liệu tải công việc" description="Chưa có chủ đề hoặc phiên kiểm duyệt nào được gán." />;
  }

  return (
    <div className={styles.rowsTable}>
      <div className={styles.rowsHeader}>
        <span>Người phụ trách</span>
        <span>Đang viết</span>
        <span>Đang duyệt</span>
        <span>Quá hạn</span>
      </div>
      {editors.map((editor) => (
        <div key={editor.owner} className={styles.rowItem}>
          <div className={styles.rowName}>{editor.owner}</div>
          <span>{editor.draftingCount}</span>
          <span>{editor.reviewCount}</span>
          <span>{editor.overdueCount}</span>
        </div>
      ))}
    </div>
  );
}
