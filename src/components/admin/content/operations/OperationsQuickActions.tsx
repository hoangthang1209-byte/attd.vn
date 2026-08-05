"use client";

import Link from "next/link";

type OperationsQuickActionsProps = {
  onScrollTo: (sectionId: string) => void;
};

/** One-click jumps for the most common cockpit actions — no new write endpoints. */
export default function OperationsQuickActions({ onScrollTo }: OperationsQuickActionsProps) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <Link href="/admin/content/seo-topics" className="admin-btn admin-btn--primary admin-btn--small">
        + Tạo chủ đề
      </Link>
      <Link href="/admin/content/calendar" className="admin-btn admin-btn--secondary admin-btn--small">
        Mở lịch biên tập
      </Link>
      <Link href="/admin/content/reviews" className="admin-btn admin-btn--secondary admin-btn--small">
        Hàng đợi kiểm duyệt
      </Link>
      <button
        type="button"
        className="admin-btn admin-btn--secondary admin-btn--small"
        onClick={() => onScrollTo("ops-refresh-queue")}
      >
        Cần làm mới
      </button>
      <button
        type="button"
        className="admin-btn admin-btn--secondary admin-btn--small"
        onClick={() => onScrollTo("ops-health")}
      >
        Sức khỏe nội dung
      </button>
    </div>
  );
}
