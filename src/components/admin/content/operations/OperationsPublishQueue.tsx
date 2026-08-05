"use client";

import Link from "next/link";
import { EmptyState } from "@/components/admin/AdminUi";
import type { PublishQueueSummary } from "@/features/content/operations/content-operations.types";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("vi-VN");
}

type OperationsPublishQueueProps = {
  summary: PublishQueueSummary;
};

/** Read-only snapshot of the Xuất bản queue — no publish/schedule action here. */
export default function OperationsPublishQueue({ summary }: OperationsPublishQueueProps) {
  if (summary.readyCount === 0 && summary.scheduledCount === 0) {
    return <EmptyState compact title="Hàng đợi xuất bản trống" description="Không có bài chờ xuất bản hoặc đã lên lịch." />;
  }
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <span className="admin-field-hint" style={{ margin: 0 }}>
          Sẵn sàng handoff: <strong>{summary.readyCount}</strong>
        </span>
        <span className="admin-field-hint" style={{ margin: 0 }}>
          Đã lên lịch: <strong>{summary.scheduledCount}</strong>
        </span>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Bài viết</th>
              <th>Trạng thái</th>
              <th>Lịch</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {[...summary.readyItems, ...summary.scheduledItems].slice(0, 15).map((item) => (
              <tr key={item.id}>
                <td>{item.title}</td>
                <td>{item.status}</td>
                <td>{formatDate(item.scheduledAt)}</td>
                <td>
                  <Link href={`/admin/blog/${item.id}`} className="admin-btn admin-btn--secondary admin-btn--small">
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
