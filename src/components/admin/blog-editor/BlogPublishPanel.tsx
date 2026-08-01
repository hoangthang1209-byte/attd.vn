"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";
import { WorkspaceSection } from "@/components/admin/blog-editor/BlogWorkspaceTabs";
import PanelSkeleton from "@/components/ui/loading/PanelSkeleton";
import type { BlogReadinessResult } from "@/features/blog/blog-readiness";
import type { BlogPostRecord } from "@/features/blog/types";

type Props = {
  post: BlogPostRecord;
  /** Canonical readiness from the workspace — the only publish gate. */
  readiness: BlogReadinessResult;
  readinessLoading: boolean;
  onReadinessRefresh: () => Promise<void> | void;
};

function toLocalInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function BlogPublishPanel({
  post,
  readiness,
  readinessLoading,
  onReadinessRefresh,
}: Props) {
  const toast = useAdminToast();
  const [events, setEvents] = useState<Array<Record<string, unknown>>>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [ackNote, setAckNote] = useState("");
  const [scheduleLocal, setScheduleLocal] = useState("");

  const loadEvents = useCallback(async () => {
    setEventsLoading(true);
    try {
      const res = await fetch(`/api/content/blog/${post.id}/publish-events`);
      const json = await res.json();
      if (res.ok) setEvents((json.events as Array<Record<string, unknown>>) ?? []);
    } finally {
      setEventsLoading(false);
    }
  }, [post.id]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      void loadEvents();
    });
    return () => {
      cancelled = true;
    };
  }, [loadEvents]);

  async function postAction(path: string, body?: Record<string, unknown>) {
    setPending(true);
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body ?? {}),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Failed");
      toast.success(json.message ?? "OK");
      await Promise.all([loadEvents(), onReadinessRefresh()]);
      if (json.publicRoute) toast.info(`Public: ${json.publicRoute}`);
      return json;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setPending(false);
    }
  }

  // A Blog handed off from a Review is governed even before its handoff record
  // exists (recovered/pipeline-linked articles).
  const governed = Boolean(post.sourceHandoffRecordId) || Boolean(post.sourceReviewSessionId);
  const publishBlocked = readinessLoading || readiness.status !== "READY";

  return (
    <>
      <WorkspaceSection
        title="Publish"
        description={
          governed
            ? "Bài viết được quản trị từ Writing Draft — chỉ xuất bản khi Readiness = READY."
            : "Bài viết thủ công — vẫn phải qua kiểm tra Readiness."
        }
        actions={
          <Link className="admin-btn admin-btn--secondary admin-btn--small" href="/admin/content/publishing">
            Dashboard
          </Link>
        }
      >
        <p className="admin-field-hint">
          Status: <strong>{post.status}</strong> · {governed ? "Governed (Writing Draft)" : "Manual Blog"} ·
          publish v{post.publishVersion ?? 0}
        </p>
        {governed && (
          <p className="admin-field-hint">
            Draft {post.sourceWritingDraftId?.slice(0, 8)}… v{post.sourceWritingDraftVersion ?? "—"} ·{" "}
            {post.sourceReviewSessionId ? (
              <Link href={`/admin/content/reviews/${post.sourceReviewSessionId}`}>Review</Link>
            ) : (
              "—"
            )}{" "}
            · Handoff {post.sourceHandoffRecordId?.slice(0, 8) ?? "—"}…
          </p>
        )}
        {post.lastPublishedAt && (
          <p className="admin-field-hint">
            Last published:{" "}
            {new Date(post.lastPublishedAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}
          </p>
        )}
        {post.contentModifiedAfterHandoff && (
          <p className="admin-field-hint admin-field-hint--warning">Nội dung đã chỉnh sau handoff.</p>
        )}
        {post.needsContentReview && (
          <p className="admin-field-hint admin-field-hint--warning">Đang chờ kiểm duyệt lại.</p>
        )}

        {governed && post.contentModifiedAfterHandoff && (
          <div className="blog-publish-ack">
            <textarea
              className="admin-input"
              rows={2}
              placeholder="Ghi chú xác nhận biên tập"
              value={ackNote}
              onChange={(e) => setAckNote(e.target.value)}
            />
            <div className="blog-publish-actions">
              <AdminLoadingButton
                pending={pending}
                size="small"
                variant="secondary"
                onClick={() =>
                  void postAction(`/api/content/blog/${post.id}/acknowledge-publish-changes`, {
                    note: ackNote,
                    confirmFactualChanges: true,
                  })
                }
              >
                Xác nhận thay đổi biên tập
              </AdminLoadingButton>
              <AdminLoadingButton
                pending={pending}
                size="small"
                variant="secondary"
                onClick={() =>
                  void postAction(`/api/content/blog/${post.id}/send-back-to-review`, {
                    note: ackNote || "Gửi lại kiểm duyệt từ Blog editor",
                  })
                }
              >
                Gửi lại kiểm duyệt
              </AdminLoadingButton>
            </div>
          </div>
        )}

        <label className="admin-field-hint blog-publish-confirm">
          <input
            type="checkbox"
            checked={confirmChecked}
            onChange={(e) => setConfirmChecked(e.target.checked)}
          />{" "}
          Tôi xác nhận nội dung đã được kiểm tra và sẵn sàng xuất bản.
        </label>

        <div className="blog-publish-actions">
          <AdminLoadingButton
            pending={pending}
            size="small"
            variant="primary"
            disabled={pending || publishBlocked}
            onClick={() => {
              if (!confirmChecked) {
                toast.error("Cần tick xác nhận xuất bản");
                return;
              }
              if (!window.confirm(`Xuất bản ngay «${post.title}» → /blog/${post.slug}?`)) return;
              void postAction(`/api/content/blog/${post.id}/publish`, { confirmChecked: true });
            }}
          >
            Xuất bản ngay
          </AdminLoadingButton>
          <AdminLoadingButton
            pending={pending}
            size="small"
            variant="secondary"
            onClick={() => void postAction(`/api/content/blog/${post.id}/unpublish`)}
          >
            Gỡ xuất bản
          </AdminLoadingButton>
          <AdminLoadingButton
            pending={pending}
            size="small"
            variant="secondary"
            onClick={() => void postAction(`/api/content/blog/${post.id}/archive`)}
          >
            Lưu trữ
          </AdminLoadingButton>
        </div>
        {publishBlocked && (
          <p className="admin-field-hint">Nút xuất bản mở khóa khi Publishing Readiness = READY.</p>
        )}
      </WorkspaceSection>

      <WorkspaceSection title="Schedule" description="Lịch lưu theo UTC; readiness được kiểm tra lại khi đến hạn.">
        {post.scheduledAt && (
          <p className="admin-field-hint">
            Lịch hiện tại:{" "}
            {new Date(post.scheduledAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}{" "}
            (Asia/Ho_Chi_Minh)
          </p>
        )}
        <div className="blog-publish-actions">
          <input
            type="datetime-local"
            className="admin-input admin-input--inline"
            value={scheduleLocal || toLocalInputValue(post.scheduledAt)}
            onChange={(e) => setScheduleLocal(e.target.value)}
          />
          <AdminLoadingButton
            pending={pending}
            size="small"
            variant="secondary"
            onClick={() => {
              if (!confirmChecked) {
                toast.error("Cần tick xác nhận");
                return;
              }
              if (!scheduleLocal) {
                toast.error("Chọn thời gian lịch");
                return;
              }
              void postAction(`/api/content/blog/${post.id}/schedule`, {
                scheduledFor: new Date(scheduleLocal).toISOString(),
                confirmChecked: true,
              });
            }}
          >
            Lên lịch
          </AdminLoadingButton>
          <AdminLoadingButton
            pending={pending}
            size="small"
            variant="secondary"
            onClick={() => {
              if (!scheduleLocal) {
                toast.error("Chọn thời gian mới");
                return;
              }
              void postAction(`/api/content/blog/${post.id}/reschedule`, {
                scheduledFor: new Date(scheduleLocal).toISOString(),
                confirmChecked: true,
              });
            }}
          >
            Đổi lịch
          </AdminLoadingButton>
          <AdminLoadingButton
            pending={pending}
            size="small"
            variant="secondary"
            onClick={() => void postAction(`/api/content/blog/${post.id}/cancel-schedule`)}
          >
            Hủy lịch
          </AdminLoadingButton>
        </div>
      </WorkspaceSection>

      <WorkspaceSection
        title="History"
        description="Nhật ký xuất bản gần nhất."
        actions={
          <button
            type="button"
            className="admin-btn admin-btn--secondary admin-btn--small"
            onClick={() => void loadEvents()}
          >
            Làm mới
          </button>
        }
      >
        {eventsLoading ? (
          <PanelSkeleton label="Đang tải lịch sử xuất bản…" lines={3} withTitle={false} />
        ) : events.length === 0 ? (
          <p className="admin-field-hint">Chưa có sự kiện xuất bản nào.</p>
        ) : (
          <ul className="blog-publish-history">
            {events.map((e) => (
              <li key={String(e.id)}>
                {String(e.action)} · {String(e.status)} ·{" "}
                {e.createdAt ? new Date(String(e.createdAt)).toLocaleString("vi-VN") : ""}
                {e.errorMessage ? ` — ${String(e.errorMessage)}` : ""}
              </li>
            ))}
          </ul>
        )}
      </WorkspaceSection>
    </>
  );
}
