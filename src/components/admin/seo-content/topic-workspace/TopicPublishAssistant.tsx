"use client";

import Link from "next/link";
import type { ChecklistGroupSummary, TopicPrimaryCta } from "@/features/content/editorial/editorial-ux";

type Props = {
  checklistGroups: ChecklistGroupSummary[];
  primaryCta: TopicPrimaryCta;
  onPrimaryCtaClick: (cta: TopicPrimaryCta) => void;
  onPreviewClick: () => void;
};

/**
 * Sprint 19.0 — single calm "ready to publish" card for the Solo canvas.
 * Pure display + navigation: it only reads the checklist groups and primary
 * CTA that `SeoTopicDetailClient` already computes, and its buttons only
 * scroll/link to the existing governed review/publish pages. It never calls
 * a publish or review-approval endpoint itself.
 */
export default function TopicPublishAssistant({
  checklistGroups,
  primaryCta,
  onPrimaryCtaClick,
  onPreviewClick,
}: Props) {
  const total = checklistGroups.reduce((sum, group) => sum + group.total, 0);
  const done = checklistGroups.reduce((sum, group) => sum + group.done, 0);
  const blockedGroups = checklistGroups.filter((group) => group.tone !== "complete");

  return (
    <section
      className="admin-sidebar-card"
      style={{ margin: "16px 0", border: "1px solid #f1f5f9", boxShadow: "none" }}
    >
      <h3 className="admin-sidebar-title">Sẵn sàng xuất bản</h3>
      <p className="admin-field-hint" style={{ margin: "0 0 10px" }}>
        {total > 0 ? `${done}/${total} mục hoàn tất` : "Chưa có checklist cho bài này."}
        {blockedGroups.length > 0
          ? ` · Cần chú ý: ${blockedGroups.map((group) => group.label).join(", ")}`
          : ""}
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" className="admin-btn admin-btn--secondary admin-btn--small" onClick={onPreviewClick}>
          Xem trước
        </button>
        {primaryCta.href && !primaryCta.staysOnPage ? (
          <Link href={primaryCta.href} className="admin-btn admin-btn--primary admin-btn--small">
            {primaryCta.label}
          </Link>
        ) : (
          <button
            type="button"
            className="admin-btn admin-btn--primary admin-btn--small"
            onClick={() => onPrimaryCtaClick(primaryCta)}
          >
            {primaryCta.label}
          </button>
        )}
      </div>
    </section>
  );
}
