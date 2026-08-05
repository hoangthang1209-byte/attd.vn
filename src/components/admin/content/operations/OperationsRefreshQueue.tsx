"use client";

import Link from "next/link";
import styles from "@/components/admin/content/operations/Operations.module.css";
import { EmptyState } from "@/components/admin/AdminUi";
import type { OpsTopicCard } from "@/features/content/operations/content-operations.types";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("vi-VN");
}

type OperationsRefreshQueueProps = {
  items: OpsTopicCard[];
};

/** Published topics flagged for refresh — stale age or missing editorial signal. */
export default function OperationsRefreshQueue({ items }: OperationsRefreshQueueProps) {
  if (items.length === 0) {
    return <EmptyState compact title="Không có bài cần làm mới" description="Tất cả bài đã xuất bản đều đạt tiêu chí biên tập hiện tại." />;
  }
  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Bài viết</th>
            <th>Xuất bản</th>
            <th>Tín hiệu thiếu</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.slice(0, 30).map((item) => {
            const gaps = [
              item.flags.missingCta && "CTA",
              item.flags.missingMeta && "Meta",
              item.flags.missingMedia && "Hình ảnh",
              item.flags.missingFaq && "FAQ",
            ].filter(Boolean) as string[];
            return (
              <tr key={item.id}>
                <td>{item.title}</td>
                <td>{formatDate(item.publishedAt)}</td>
                <td>
                  <span className={styles.cardMeta} style={{ marginTop: 0 }}>
                    {gaps.length > 0 ? gaps.join(", ") : "Tuổi nội dung"}
                  </span>
                </td>
                <td>
                  <Link href={item.href} className="admin-btn admin-btn--secondary admin-btn--small">
                    Mở
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
