"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import {
  AdminLoadingState,
  DataToolbar,
  EmptyState,
  StatusBadge,
  WorkspaceToolbarEnd,
} from "@/components/admin/AdminUi";
import {
  CONTENT_STATUS_COLORS,
  REVIEW_STATUS_LABELS,
} from "@/features/content/editorial/editorial-ux";

type ReviewRow = {
  id: string;
  status: string;
  writingDraftId: string;
  writingDraftVersion: number;
  topicId: string | null;
  topicTitle: string | null;
  contentType: string | null;
  draftStatus: string | null;
  qaScore: number | null;
  blockingIssues: number;
  sectionProgress: {
    total: number;
    approved: number;
    pending: number;
    changesRequested: number;
    rejected: number;
  };
  assignedReviewerId: string | null;
  updatedAt: string;
  targetBlogId: string | null;
  readyForHandoff: boolean;
};

function reviewTone(status: string): "neutral" | "info" | "success" | "warning" | "danger" {
  if (status === "APPROVED") return "success";
  if (status === "CHANGES_REQUESTED" || status === "IN_REVIEW") return "warning";
  if (status === "REJECTED") return "danger";
  return "info";
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${Math.max(1, mins)} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.floor(hours / 24)} ngày trước`;
}

export default function ContentReviewsClient() {
  const toast = useAdminToast();
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [status, setStatus] = useState("");
  const [assignedMe, setAssignedMe] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filtersActive = Boolean(status || assignedMe);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (status) qs.set("status", status);
      if (assignedMe) qs.set("assigned", "me");
      const res = await fetch(`/api/content/reviews?${qs.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Load failed");
      setReviews(data.reviews ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Không tải danh sách";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [status, assignedMe, toast]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  return (
    <div className="admin-panel">
      <p className="admin-field-hint" style={{ margin: 0 }}>
        Workspace kiểm duyệt biên tập — mỗi thẻ có một hành động chính: mở bản nháp để duyệt.
      </p>

      <DataToolbar data-testid="content-reviews-toolbar">
        <select className="admin-input" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Tất cả trạng thái</option>
          {Object.entries(REVIEW_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <label className="admin-field-hint admin-data-toolbar__checkbox">
          <input type="checkbox" checked={assignedMe} onChange={(e) => setAssignedMe(e.target.checked)} />
          Gán cho tôi
        </label>
        <WorkspaceToolbarEnd>
          <button type="button" className="admin-btn admin-btn--secondary admin-btn--small" onClick={() => void load()}>
            Làm mới
          </button>
        </WorkspaceToolbarEnd>
      </DataToolbar>

      {loading ? (
        <AdminLoadingState label="Đang tải hàng đợi kiểm duyệt…" rows={4} />
      ) : error ? (
        <EmptyState
          tone="error"
          title="Không tải được hàng đợi kiểm duyệt"
          description={error}
          action={
            <button type="button" className="admin-btn" onClick={() => void load()}>
              Thử lại
            </button>
          }
        />
      ) : reviews.length === 0 ? (
        <EmptyState
          title={
            filtersActive
              ? "Không có bài phù hợp với bộ lọc hiện tại"
              : "Chưa có bài chờ kiểm duyệt"
          }
          description={
            filtersActive
              ? "Thử đổi trạng thái hoặc bỏ lọc “Gán cho tôi”."
              : "Khi bản nháp sẵn sàng để duyệt, chúng sẽ xuất hiện tại đây để Content Lead / SEO Manager xử lý."
          }
          action={
            <Link href="/admin/content/seo" className="admin-btn admin-btn--primary">
              Về Content Dashboard
            </Link>
          }
        />
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 12,
          }}
        >
          {reviews.map((r) => {
            const primaryHref = `/admin/content/reviews/${r.id}`;
            const primaryLabel =
              r.status === "CHANGES_REQUESTED"
                ? "Xem yêu cầu chỉnh sửa"
                : r.status === "APPROVED"
                  ? "Mở bản đã duyệt"
                  : "Kiểm duyệt";
            return (
              <article key={r.id} className="admin-sidebar-card" style={{ margin: 0, display: "grid", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <strong>
                    {r.topicId ? (
                      <Link href={`/admin/content/seo-topics/${r.topicId}`} className="admin-link">
                        {r.topicTitle ?? "Chủ đề"}
                      </Link>
                    ) : (
                      "Bản nháp không gắn chủ đề"
                    )}
                  </strong>
                  <StatusBadge tone={reviewTone(r.status)}>
                    {REVIEW_STATUS_LABELS[r.status] ?? r.status}
                  </StatusBadge>
                </div>
                <p className="admin-field-hint" style={{ margin: 0 }}>
                  Bản nháp v{r.writingDraftVersion}
                  {r.contentType ? ` · ${r.contentType}` : ""}
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 13 }}>
                  <div>
                    <div className="admin-field-hint">Điểm QA</div>
                    <strong>{r.qaScore ?? "—"}</strong>
                  </div>
                  <div>
                    <div className="admin-field-hint">Lỗi chặn</div>
                    <strong style={{ color: r.blockingIssues > 0 ? CONTENT_STATUS_COLORS.blocked.fg : undefined }}>
                      {r.blockingIssues}
                    </strong>
                  </div>
                  <div>
                    <div className="admin-field-hint">Tiến độ section</div>
                    <strong>
                      {r.sectionProgress.approved}/{r.sectionProgress.total}
                    </strong>
                  </div>
                  <div>
                    <div className="admin-field-hint">Cập nhật</div>
                    <strong>{formatRelative(r.updatedAt)}</strong>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Link href={primaryHref} className="admin-btn admin-btn--primary admin-btn--small">
                    {primaryLabel}
                  </Link>
                  {r.targetBlogId ? (
                    <Link href={`/admin/blog/${r.targetBlogId}`} className="admin-btn admin-btn--secondary admin-btn--small">
                      Mở Blog
                    </Link>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
