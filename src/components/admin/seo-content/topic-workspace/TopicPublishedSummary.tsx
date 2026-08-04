"use client";

import Link from "next/link";
import styles from "@/components/admin/seo-content/topic-workspace/TopicWorkspace.module.css";

type Props = {
  publicUrl: string | null;
  updatedAtLabel: string;
  performanceHref: string;
};

/** Read-only landing for PUBLISHED topics — no "Continue Writing" affordance. */
export default function TopicPublishedSummary({ publicUrl, updatedAtLabel, performanceHref }: Props) {
  return (
    <div className={styles.canvasBlockSoft}>
      <h3 className="admin-sidebar-title">Bài đã xuất bản</h3>
      <p className="admin-field-hint" style={{ margin: "0 0 8px" }}>
        Nội dung đã được duyệt và xuất bản. Trang này giờ hiển thị bản tóm tắt — chỉnh sửa lại qua Advanced nếu cần.
      </p>
      <p style={{ margin: "0 0 6px" }}>
        URL công khai:{" "}
        {publicUrl ? (
          <Link href={publicUrl} className="admin-link" target="_blank" rel="noreferrer">
            {publicUrl}
          </Link>
        ) : (
          "Chưa có"
        )}
      </p>
      <p className="admin-field-hint" style={{ margin: 0 }}>
        Cập nhật lần cuối: {updatedAtLabel} ·{" "}
        <Link href={performanceHref} className="admin-link">
          Xem hiệu quả
        </Link>
      </p>
    </div>
  );
}
