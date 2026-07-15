"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAdminToast } from "@/components/admin/AdminToastProvider";

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

export default function ContentReviewsClient() {
  const toast = useAdminToast();
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [status, setStatus] = useState("");
  const [assignedMe, setAssignedMe] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (status) qs.set("status", status);
      if (assignedMe) qs.set("assigned", "me");
      const res = await fetch(`/api/content/reviews?${qs.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Load failed");
      setReviews(data.reviews ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không tải danh sách");
    } finally {
      setLoading(false);
    }
  }, [status, assignedMe, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="admin-page">
      <h1 className="admin-page-title">Kiểm duyệt nội dung</h1>
      <p className="admin-field-hint">
        Review workspace cho Writing Draft — approve thủ công trước khi handoff Blog DRAFT.
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        <select className="admin-input" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Tất cả trạng thái</option>
          <option value="NOT_STARTED">Not started</option>
          <option value="IN_REVIEW">In review</option>
          <option value="CHANGES_REQUESTED">Changes requested</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="SUPERSEDED">Superseded</option>
        </select>
        <label className="admin-field-hint">
          <input type="checkbox" checked={assignedMe} onChange={(e) => setAssignedMe(e.target.checked)} /> Assigned to me
        </label>
        <button type="button" className="admin-btn admin-btn--secondary admin-btn--small" onClick={() => void load()}>
          Refresh
        </button>
      </div>

      {loading ? <p>Đang tải…</p> : null}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Topic</th>
              <th>Draft</th>
              <th>Version</th>
              <th>Type</th>
              <th>Review</th>
              <th>Sections</th>
              <th>QA</th>
              <th>Blocking</th>
              <th>Blog</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {reviews.map((r) => (
              <tr key={r.id}>
                <td>
                  {r.topicId ? (
                    <Link href={`/admin/content/seo-topics/${r.topicId}`}>{r.topicTitle ?? r.topicId}</Link>
                  ) : (
                    "—"
                  )}
                </td>
                <td>{r.writingDraftId.slice(0, 8)}…</td>
                <td>v{r.writingDraftVersion}</td>
                <td>{r.contentType ?? "—"}</td>
                <td>{r.status}</td>
                <td>
                  {r.sectionProgress.approved}/{r.sectionProgress.total}
                </td>
                <td>{r.qaScore ?? "—"}</td>
                <td>{r.blockingIssues}</td>
                <td>
                  {r.targetBlogId ? (
                    <Link href={`/admin/blog/${r.targetBlogId}`}>Open</Link>
                  ) : r.readyForHandoff ? (
                    "Ready"
                  ) : (
                    "—"
                  )}
                </td>
                <td>
                  <Link className="admin-btn admin-btn--secondary admin-btn--small" href={`/admin/content/reviews/${r.id}`}>
                    Open
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
