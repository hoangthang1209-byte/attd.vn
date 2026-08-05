"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import styles from "@/components/admin/content/operations/Operations.module.css";
import { AdminLoadingState, EmptyState } from "@/components/admin/AdminUi";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import OperationsQueueHealth from "@/components/admin/content/operations/OperationsQueueHealth";
import { REVIEW_STATUS_LABELS } from "@/features/content/editorial/editorial-ux";
import { SEO_TOPIC_PRIORITY_LABELS } from "@/features/content/seo/seo-labels";
import type { ReviewInbox, ReviewInboxGroupKey, ReviewInboxItem } from "@/features/content/operations/content-operations.types";

const GROUP_LABELS: Record<ReviewInboxGroupKey, string> = {
  high_priority: "Ưu tiên cao",
  waiting_today: "Chờ trong hôm nay",
  overdue: "Quá hạn chờ duyệt",
  recently_submitted: "Vừa gửi (24h)",
};

const GROUP_ORDER: ReviewInboxGroupKey[] = ["overdue", "high_priority", "waiting_today", "recently_submitted"];

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("vi-VN");
}

function ReviewInboxRow({ item, onOpenTimeline }: { item: ReviewInboxItem; onOpenTimeline?: (topicId: string) => void }) {
  return (
    <div className={styles.inboxRow}>
      <div className={styles.inboxRowMain}>
        <div className={styles.inboxRowTitle}>{item.topicTitle ?? "(Không rõ chủ đề)"}</div>
        <div className={styles.inboxRowMeta}>
          <span>{item.owner ?? "Chưa gán"}</span>
          <span>·</span>
          <span>{item.campaign ?? "—"}</span>
          <span>·</span>
          <span>{item.priority ? SEO_TOPIC_PRIORITY_LABELS[item.priority] : "—"}</span>
        </div>
      </div>
      <div className={styles.inboxRowStat}>
        <span className={styles.inboxRowStatLabel}>Người duyệt</span>
        <span>{item.assignedReviewerId ?? "Chưa gán"}</span>
      </div>
      <div className={styles.inboxRowStat}>
        <span className={styles.inboxRowStatLabel}>Gửi</span>
        <span>{formatDate(item.createdAt)}</span>
      </div>
      <div className={styles.inboxRowStat}>
        <span className={styles.inboxRowStatLabel}>Chờ</span>
        <span>{item.waitingDays} ngày</span>
      </div>
      <div className={styles.inboxRowStat}>
        <span className={styles.inboxRowStatLabel}>QA</span>
        <span>{item.qaScore != null ? item.qaScore : "—"}</span>
      </div>
      <div className={styles.inboxRowStat}>
        <span className={styles.inboxRowStatLabel}>Blocking</span>
        <span>{item.blockingIssues}</span>
      </div>
      <div className={styles.inboxRowStat}>
        <span className={styles.inboxRowStatLabel}>Trạng thái</span>
        <span>{REVIEW_STATUS_LABELS[item.status] ?? item.status}</span>
      </div>
      <div className={styles.inboxRowActions}>
        <Link href={`/admin/content/reviews/${item.id}`} className="admin-btn admin-btn--secondary admin-btn--small">
          Mở kiểm duyệt
        </Link>
        {item.topicId && onOpenTimeline ? (
          <button
            type="button"
            className="admin-btn admin-btn--secondary admin-btn--small"
            onClick={() => onOpenTimeline(item.topicId!)}
          >
            Dòng thời gian
          </button>
        ) : null}
      </div>
    </div>
  );
}

function matchesQuery(item: ReviewInboxItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    (item.topicTitle ?? "").toLowerCase().includes(q) ||
    (item.owner ?? "").toLowerCase().includes(q) ||
    (item.campaign ?? "").toLowerCase().includes(q) ||
    (item.assignedReviewerId ?? "").toLowerCase().includes(q)
  );
}

type OperationsReviewInboxProps = {
  initialGroup?: ReviewInboxGroupKey | null;
  onOpenTimeline?: (topicId: string) => void;
  searchQuery?: string;
};

/**
 * Dense, group-based review inbox. Fetches `GET /api/content/operations/reviews`
 * on mount — read-only, no approve/reject/reassign action lives here.
 */
export default function OperationsReviewInbox({ initialGroup, onOpenTimeline, searchQuery = "" }: OperationsReviewInboxProps) {
  const toast = useAdminToast();
  const [inbox, setInbox] = useState<ReviewInbox | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeGroup, setActiveGroup] = useState<ReviewInboxGroupKey | "all">(initialGroup ?? "all");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/content/operations/reviews", { cache: "no-store" });
      const json = (await res.json()) as { inbox?: ReviewInbox; message?: string };
      if (!res.ok || !json.inbox) throw new Error(json.message ?? "Không tải được hàng đợi kiểm duyệt");
      setInbox(json.inbox);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Không tải được hàng đợi kiểm duyệt";
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
    if (initialGroup) setActiveGroup(initialGroup);
  }, [initialGroup]);

  if (loading) return <AdminLoadingState label="Đang tải hàng đợi kiểm duyệt…" rows={4} />;
  if (error || !inbox) {
    return (
      <EmptyState
        compact
        tone="error"
        title="Không tải được hàng đợi kiểm duyệt"
        description={error ?? "Không có dữ liệu"}
        action={
          <button type="button" className="admin-btn admin-btn--primary admin-btn--small" onClick={() => void load()}>
            Thử lại
          </button>
        }
      />
    );
  }

  const visibleGroups = activeGroup === "all" ? GROUP_ORDER : [activeGroup];

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <OperationsQueueHealth health={inbox.health} />

      <div className={styles.inboxGroupTabs}>
        <button
          type="button"
          className={activeGroup === "all" ? "admin-btn admin-btn--primary admin-btn--small" : "admin-btn admin-btn--secondary admin-btn--small"}
          onClick={() => setActiveGroup("all")}
        >
          Tất cả ({inbox.items.length})
        </button>
        {GROUP_ORDER.map((key) => (
          <button
            key={key}
            type="button"
            className={activeGroup === key ? "admin-btn admin-btn--primary admin-btn--small" : "admin-btn admin-btn--secondary admin-btn--small"}
            onClick={() => setActiveGroup(key)}
          >
            {GROUP_LABELS[key]} ({inbox.groups[key].length})
          </button>
        ))}
        <button type="button" className="admin-btn admin-btn--secondary admin-btn--small" onClick={() => void load()}>
          Tải lại
        </button>
      </div>

      {inbox.items.length === 0 ? (
        <EmptyState compact title="Không có phiên kiểm duyệt" description="Hàng đợi kiểm duyệt trống." />
      ) : (
        visibleGroups.map((key) => {
          const items = inbox.groups[key].filter((item) => matchesQuery(item, searchQuery));
          if (activeGroup === "all" && items.length === 0) return null;
          return (
            <section key={key} aria-label={GROUP_LABELS[key]}>
              <h4 className={styles.inboxGroupHeading}>
                {GROUP_LABELS[key]} <span className={styles.inboxGroupCount}>{items.length}</span>
              </h4>
              {items.length === 0 ? (
                <p className="admin-field-hint" style={{ margin: "4px 0 8px" }}>
                  Không có mục nào.
                </p>
              ) : (
                <div className={styles.inboxList}>
                  {items.map((item) => (
                    <ReviewInboxRow key={`${key}-${item.id}`} item={item} onOpenTimeline={onOpenTimeline} />
                  ))}
                </div>
              )}
            </section>
          );
        })
      )}
    </div>
  );
}
