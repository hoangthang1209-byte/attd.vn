"use client";

import { useCallback, useEffect, useState } from "react";
import styles from "@/components/admin/content/operations/Operations.module.css";
import { AdminLoadingState, EmptyState } from "@/components/admin/AdminUi";
import { buildPublishOpsStats } from "@/features/content/operations/content-operations.mapping";
import type { PublishInbox, PublishOpsStats } from "@/features/content/operations/content-operations.types";

/** One-line publish-ops stat strip. Fetches its own publish inbox on mount (lazy, section-scoped). */
export default function OperationsPublishOps() {
  const [stats, setStats] = useState<PublishOpsStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setStats(null);
    try {
      const res = await fetch("/api/content/operations/publish", { cache: "no-store" });
      const json = (await res.json()) as { inbox?: PublishInbox; message?: string };
      if (!res.ok || !json.inbox) throw new Error(json.message ?? "Không tải được thống kê xuất bản");
      setStats(buildPublishOpsStats(json.inbox.groups));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được thống kê xuất bản");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (stats === null && !error) return <AdminLoadingState label="Đang tải thống kê xuất bản…" rows={2} />;
  if (error) {
    return (
      <EmptyState
        compact
        tone="error"
        title="Không tải được thống kê xuất bản"
        description={error}
        action={
          <button type="button" className="admin-btn admin-btn--primary admin-btn--small" onClick={() => void load()}>
            Thử lại
          </button>
        }
      />
    );
  }

  const entries: Array<{ key: string; label: string; value: number }> = [
    { key: "ready", label: "Sẵn sàng", value: stats!.readyCount },
    { key: "scheduled", label: "Đã lên lịch", value: stats!.scheduledCount },
    { key: "failed", label: "Thất bại", value: stats!.failedCount },
    { key: "publishedToday", label: "Xuất bản hôm nay", value: stats!.publishedTodayCount },
    { key: "waiting", label: "Chờ xác nhận", value: stats!.waitingCount },
  ];
  return (
    <div className={styles.queueHealthStrip} role="group" aria-label="Thống kê xuất bản">
      {entries.map((entry) => (
        <div key={entry.key} className={styles.queueHealthItem}>
          <span className={styles.queueHealthValue}>{entry.value}</span>
          <span className={styles.queueHealthLabel}>{entry.label}</span>
        </div>
      ))}
    </div>
  );
}
