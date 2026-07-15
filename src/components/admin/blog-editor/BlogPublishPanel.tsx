"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";
import type { BlogPostRecord } from "@/features/blog/types";

type Readiness = {
  ready: boolean;
  governed: boolean;
  contentHash: string;
  materiallyChangedAfterHandoff: boolean;
  errors: string[];
  warnings: string[];
  checks: Record<string, boolean>;
  sourceWritingDraftId?: string | null;
  sourceDraftVersion?: number | null;
  approvedReviewSessionId?: string | null;
  handoffRecordId?: string | null;
};

type Props = { post: BlogPostRecord };

function toLocalInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  // Display/edit in Asia/Ho_Chi_Minh wall clock via locale offset of browser;
  // store as ISO UTC when submitting.
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function BlogPublishPanel({ post }: Props) {
  const toast = useAdminToast();
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [events, setEvents] = useState<Array<Record<string, unknown>>>([]);
  const [pending, setPending] = useState(false);
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [ackNote, setAckNote] = useState("");
  const [scheduleLocal, setScheduleLocal] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  const load = useCallback(async () => {
    const [rRes, eRes] = await Promise.all([
      fetch(`/api/content/blog/${post.id}/publish-readiness`),
      fetch(`/api/content/blog/${post.id}/publish-events`),
    ]);
    const rJson = await rRes.json();
    const eJson = await eRes.json();
    if (rRes.ok) setReadiness(rJson.readiness as Readiness);
    if (eRes.ok) setEvents((eJson.events as Array<Record<string, unknown>>) ?? []);
  }, [post.id]);

  useEffect(() => {
    void load();
  }, [load]);

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
      await load();
      if (json.publicRoute) toast.info(`Public: ${json.publicRoute}`);
      return json;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setPending(false);
    }
  }

  const governed = Boolean(post.sourceHandoffRecordId);

  return (
    <div className="admin-sidebar-card" style={{ marginBottom: 16 }}>
      <h3 className="admin-sidebar-title">Xuất bản nội dung</h3>
      <p className="admin-field-hint">
        Status: <strong>{post.status}</strong> ·{" "}
        {governed ? "Governed (Writing Draft)" : "Manual Blog"} · publish v
        {post.publishVersion ?? 0}
      </p>
      {governed && (
        <p className="admin-field-hint">
          Draft {post.sourceWritingDraftId?.slice(0, 8)}… v{post.sourceWritingDraftVersion ?? "—"} ·{" "}
          {post.sourceReviewSessionId ? (
            <Link href={`/admin/content/reviews/${post.sourceReviewSessionId}`}>Review</Link>
          ) : (
            "—"
          )}{" "}
          · Handoff {post.sourceHandoffRecordId?.slice(0, 8)}…
        </p>
      )}
      {post.scheduledAt && (
        <p className="admin-field-hint">
          Lịch: {new Date(post.scheduledAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}{" "}
          (Asia/Ho_Chi_Minh)
        </p>
      )}
      {post.lastPublishedAt && (
        <p className="admin-field-hint">
          Last published:{" "}
          {new Date(post.lastPublishedAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}
        </p>
      )}
      {post.contentModifiedAfterHandoff && (
        <p style={{ color: "#b45309" }}>Nội dung đã chỉnh sau handoff.</p>
      )}
      {post.needsContentReview && <p style={{ color: "#c00" }}>Đang chờ kiểm duyệt lại.</p>}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
        <AdminLoadingButton pending={pending} size="small" variant="secondary" onClick={() => void load()}>
          Kiểm tra sẵn sàng
        </AdminLoadingButton>
        <button
          type="button"
          className="admin-btn admin-btn--secondary admin-btn--small"
          onClick={() => setShowHistory((v) => !v)}
        >
          Lịch sử xuất bản
        </button>
        <Link className="admin-btn admin-btn--secondary admin-btn--small" href="/admin/content/publishing">
          Dashboard
        </Link>
      </div>

      {readiness && (
        <div style={{ marginBottom: 8 }}>
          <p className="admin-field-hint">
            Ready: <strong>{readiness.ready ? "YES" : "NO"}</strong>
          </p>
          {readiness.errors.map((e) => (
            <p key={e} style={{ color: "#c00", margin: "2px 0", fontSize: 13 }}>
              {e}
            </p>
          ))}
          {readiness.warnings.map((w) => (
            <p key={w} style={{ color: "#b45309", margin: "2px 0", fontSize: 13 }}>
              {w}
            </p>
          ))}
        </div>
      )}

      {governed && post.contentModifiedAfterHandoff && (
        <div style={{ marginBottom: 8 }}>
          <textarea
            className="admin-input"
            rows={2}
            placeholder="Ghi chú xác nhận biên tập"
            value={ackNote}
            onChange={(e) => setAckNote(e.target.value)}
          />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
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

      <label className="admin-field-hint" style={{ display: "block", marginBottom: 8 }}>
        <input
          type="checkbox"
          checked={confirmChecked}
          onChange={(e) => setConfirmChecked(e.target.checked)}
        />{" "}
        Tôi xác nhận nội dung đã được kiểm tra và sẵn sàng xuất bản.
      </label>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
        <AdminLoadingButton
          pending={pending}
          size="small"
          variant="primary"
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

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
        <input
          type="datetime-local"
          className="admin-input"
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
            const iso = new Date(scheduleLocal).toISOString();
            void postAction(`/api/content/blog/${post.id}/schedule`, {
              scheduledFor: iso,
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
      <p className="admin-field-hint">
        Lịch lưu UTC; khi đến hạn readiness được kiểm tra lại. Cron mỗi 10 phút nếu secret được cấu hình.
      </p>

      {showHistory && (
        <ul style={{ fontSize: 12, paddingLeft: 16, marginTop: 8 }}>
          {events.map((e) => (
            <li key={String(e.id)}>
              {String(e.action)} · {String(e.status)} ·{" "}
              {e.createdAt ? new Date(String(e.createdAt)).toLocaleString("vi-VN") : ""}
              {e.errorMessage ? ` — ${String(e.errorMessage)}` : ""}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
