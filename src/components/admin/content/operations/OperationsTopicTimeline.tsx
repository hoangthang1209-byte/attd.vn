"use client";

import { useCallback, useEffect, useState } from "react";
import styles from "@/components/admin/content/operations/Operations.module.css";
import { AdminLoadingState, EmptyState } from "@/components/admin/AdminUi";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import type { OpsActivityEvent } from "@/features/content/operations/content-operations.types";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

type OperationsTopicTimelineProps = {
  topicId: string | null;
  onClose: () => void;
};

/**
 * Slide-over panel showing one topic's chronological audit trail — derived
 * from GET /api/content/operations/topic/[id]/timeline. Read-only.
 */
export default function OperationsTopicTimeline({ topicId, onClose }: OperationsTopicTimelineProps) {
  const toast = useAdminToast();
  const [events, setEvents] = useState<OpsActivityEvent[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/content/operations/topic/${id}/timeline`, { cache: "no-store" });
        const json = (await res.json()) as { timeline?: OpsActivityEvent[]; message?: string };
        if (!res.ok || !json.timeline) throw new Error(json.message ?? "Không tải được dòng thời gian");
        setEvents(json.timeline);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Không tải được dòng thời gian";
        setError(message);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    },
    [toast],
  );

  useEffect(() => {
    if (topicId) void load(topicId);
    else setEvents(null);
  }, [topicId, load]);

  if (!topicId) return null;

  return (
    <div className={styles.timelinePanelOverlay} role="dialog" aria-label="Dòng thời gian chủ đề" onClick={onClose}>
      <div className={styles.timelinePanel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.timelinePanelHeader}>
          <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>Dòng thời gian vận hành</h3>
          <button type="button" className="admin-btn admin-btn--secondary admin-btn--small" onClick={onClose}>
            Đóng
          </button>
        </div>
        {loading ? (
          <AdminLoadingState label="Đang tải dòng thời gian…" rows={3} />
        ) : error || !events ? (
          <EmptyState compact tone="error" title="Không tải được dòng thời gian" description={error ?? "Không có dữ liệu"} />
        ) : events.length === 0 ? (
          <EmptyState compact title="Chưa có hoạt động" description="Chủ đề này chưa có bản nháp/kiểm duyệt/xuất bản nào được ghi nhận." />
        ) : (
          <ol className={styles.timelineList}>
            {events.map((event) => (
              <li key={event.id} className={styles.timelineItem}>
                <span className={styles.timelineTime}>{formatDateTime(event.at)}</span>
                <span className={styles.timelineText}>{event.text}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
