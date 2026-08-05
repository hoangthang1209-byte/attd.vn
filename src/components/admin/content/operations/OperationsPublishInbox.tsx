"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import styles from "@/components/admin/content/operations/Operations.module.css";
import { AdminLoadingState, EmptyState } from "@/components/admin/AdminUi";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import { buildPublishOpsStats } from "@/features/content/operations/content-operations.mapping";
import type { PublishInbox, PublishInboxGroupKey, PublishInboxItem } from "@/features/content/operations/content-operations.types";

const GROUP_LABELS: Record<PublishInboxGroupKey, string> = {
  ready_today: "Sẵn sàng hôm nay",
  scheduled: "Đã lên lịch",
  failed: "Thất bại",
  waiting: "Cần xác nhận lại",
  published_today: "Đã xuất bản hôm nay",
};

const GROUP_ORDER: PublishInboxGroupKey[] = ["failed", "ready_today", "scheduled", "waiting", "published_today"];

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function PublishInboxRow({ item }: { item: PublishInboxItem }) {
  return (
    <div className={styles.inboxRow}>
      <div className={styles.inboxRowMain}>
        <div className={styles.inboxRowTitle}>{item.title}</div>
        {item.errorMessage ? <div className={styles.inboxRowError}>{item.errorMessage}</div> : null}
      </div>
      <div className={styles.inboxRowStat}>
        <span className={styles.inboxRowStatLabel}>Trạng thái</span>
        <span>{item.status}</span>
      </div>
      <div className={styles.inboxRowStat}>
        <span className={styles.inboxRowStatLabel}>Lịch</span>
        <span>{formatDateTime(item.scheduledAt)}</span>
      </div>
      <div className={styles.inboxRowStat}>
        <span className={styles.inboxRowStatLabel}>Xuất bản</span>
        <span>{formatDateTime(item.publishedAt)}</span>
      </div>
      <div className={styles.inboxRowActions}>
        <Link href={`/admin/blog/${item.id}`} className="admin-btn admin-btn--secondary admin-btn--small">
          Mở Blog
        </Link>
      </div>
    </div>
  );
}

function matchesQuery(item: PublishInboxItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return item.title.toLowerCase().includes(q) || item.slug.toLowerCase().includes(q);
}

type OperationsPublishInboxProps = {
  searchQuery?: string;
  /** Scrolls the matching group section into view once loaded — a highlight, not an exclusive filter. */
  initialGroup?: PublishInboxGroupKey | null;
};

/**
 * Dense publish inbox. Fetches `GET /api/content/operations/publish` on
 * mount — link-only actions, never publishes/schedules/cancels from here.
 */
export default function OperationsPublishInbox({ searchQuery = "", initialGroup }: OperationsPublishInboxProps) {
  const toast = useAdminToast();
  const [inbox, setInbox] = useState<PublishInbox | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/content/operations/publish", { cache: "no-store" });
      const json = (await res.json()) as { inbox?: PublishInbox; message?: string };
      if (!res.ok || !json.inbox) throw new Error(json.message ?? "Không tải được hàng đợi xuất bản");
      setInbox(json.inbox);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Không tải được hàng đợi xuất bản";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!inbox || !initialGroup) return;
    document.getElementById(`publish-group-${initialGroup}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [inbox, initialGroup]);

  if (loading) return <AdminLoadingState label="Đang tải hàng đợi xuất bản…" rows={4} />;
  if (error || !inbox) {
    return (
      <EmptyState
        compact
        tone="error"
        title="Không tải được hàng đợi xuất bản"
        description={error ?? "Không có dữ liệu"}
        action={
          <button type="button" className="admin-btn admin-btn--primary admin-btn--small" onClick={() => void load()}>
            Thử lại
          </button>
        }
      />
    );
  }

  const total = GROUP_ORDER.reduce((sum, key) => sum + inbox.groups[key].length, 0);
  if (total === 0) {
    return <EmptyState compact title="Hàng đợi xuất bản trống" description="Không có bài chờ, lỗi, hoặc mới xuất bản." />;
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className={styles.queueHealthStrip} role="group" aria-label="Thống kê xuất bản">
        {(() => {
          const stats = buildPublishOpsStats(inbox.groups);
          const entries: Array<{ key: string; label: string; value: number }> = [
            { key: "ready", label: "Sẵn sàng", value: stats.readyCount },
            { key: "scheduled", label: "Đã lên lịch", value: stats.scheduledCount },
            { key: "failed", label: "Thất bại", value: stats.failedCount },
            { key: "publishedToday", label: "Xuất bản hôm nay", value: stats.publishedTodayCount },
            { key: "waiting", label: "Chờ xác nhận", value: stats.waitingCount },
          ];
          return entries.map((entry) => (
            <div key={entry.key} className={styles.queueHealthItem}>
              <span className={styles.queueHealthValue}>{entry.value}</span>
              <span className={styles.queueHealthLabel}>{entry.label}</span>
            </div>
          ));
        })()}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="button" className="admin-btn admin-btn--secondary admin-btn--small" onClick={() => void load()}>
          Tải lại
        </button>
      </div>
      {GROUP_ORDER.map((key) => {
        const items = inbox.groups[key].filter((item) => matchesQuery(item, searchQuery));
        if (items.length === 0) return null;
        return (
          <section key={key} id={`publish-group-${key}`} aria-label={GROUP_LABELS[key]}>
            <h4 className={styles.inboxGroupHeading}>
              {GROUP_LABELS[key]} <span className={styles.inboxGroupCount}>{items.length}</span>
            </h4>
            <div className={styles.inboxList}>
              {items.map((item) => (
                <PublishInboxRow key={`${key}-${item.id}`} item={item} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
