"use client";

import Link from "next/link";
import { EmptyState } from "@/components/admin/AdminUi";
import { REVIEW_STATUS_LABELS } from "@/features/content/editorial/editorial-ux";
import type { ReviewQueueSummary } from "@/features/content/operations/content-operations.types";

type OperationsReviewQueueProps = {
  summary: ReviewQueueSummary;
};

/** Read-only snapshot of the Kiểm duyệt queue — link opens the governed review workspace. */
export default function OperationsReviewQueue({ summary }: OperationsReviewQueueProps) {
  if (summary.total === 0) {
    return <EmptyState compact title="Không có phiên kiểm duyệt" description="Hàng đợi kiểm duyệt trống." />;
  }
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <span className="admin-field-hint" style={{ margin: 0 }}>
          Đang kiểm duyệt: <strong>{summary.inReviewCount}</strong>
        </span>
        <span className="admin-field-hint" style={{ margin: 0 }}>
          Yêu cầu chỉnh sửa: <strong>{summary.changesRequestedCount}</strong>
        </span>
        <span className="admin-field-hint" style={{ margin: 0 }}>
          Đã duyệt: <strong>{summary.approvedCount}</strong>
        </span>
        <span className="admin-field-hint" style={{ margin: 0 }}>
          Blocking issues: <strong>{summary.blockingIssuesTotal}</strong>
        </span>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Bài viết</th>
              <th>Trạng thái</th>
              <th>Blocking</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {summary.items.slice(0, 15).map((item) => (
              <tr key={item.id}>
                <td>{item.topicTitle ?? "—"}</td>
                <td>{REVIEW_STATUS_LABELS[item.status] ?? item.status}</td>
                <td>{item.blockingIssues}</td>
                <td>
                  <Link href={`/admin/content/reviews/${item.id}`} className="admin-btn admin-btn--secondary admin-btn--small">
                    Mở
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
