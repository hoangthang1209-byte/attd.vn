import Link from "next/link";
import type { SeoCampaign, SeoPlanItem } from "@/features/blog/seo-planning-types";
import { buildSeoPlanningHandoffUrl } from "@/features/blog/seo-planning";
import {
  SEO_PLAN_PRIORITY_LABELS,
  SEO_PLAN_STATUS_LABELS,
} from "@/features/blog/seo-planning-status";

type SeoPlanItemCardProps = {
  item: SeoPlanItem;
  campaign: SeoCampaign;
};

function priorityClass(priority: SeoPlanItem["priority"]): string {
  if (priority === "HIGH") return "admin-cluster-priority--high";
  if (priority === "MEDIUM") return "admin-cluster-priority--medium";
  return "admin-cluster-priority--low";
}

export default function SeoPlanItemCard({ item, campaign }: SeoPlanItemCardProps) {
  const hasPost = Boolean(item.matchedPost);
  const isPublished = item.matchedPost?.status === "PUBLISHED" || item.status === "PUBLISHED";

  return (
    <article className="admin-seo-plan-item-card">
      <div className="admin-seo-plan-item-main">
        <strong>{item.title}</strong>
        <p className="admin-field-hint">{item.keyword}</p>
        <p className="admin-field-hint">
          {item.articleType === "pillar" ? "Pillar" : "Supporting"} · Tuần{" "}
          {item.suggestedPublishWeek}
        </p>
        {hasPost ? (
          <p className="admin-seo-plan-match admin-seo-plan-match--ok">
            ✓ Đã có bài
            {isPublished ? " · ✓ Đã xuất bản" : ""}
          </p>
        ) : (
          <p className="admin-seo-plan-match admin-seo-plan-match--missing">Chưa tạo</p>
        )}
      </div>
      <span className={`admin-cluster-priority ${priorityClass(item.priority)}`}>
        {SEO_PLAN_PRIORITY_LABELS[item.priority]}
      </span>
      <div className="admin-seo-plan-item-actions">
        {hasPost ? (
          <>
            <Link
              href={`/admin/blog/${item.matchedPost!.id}`}
              className="admin-btn admin-btn--secondary admin-btn--small"
            >
              Sửa bài viết
            </Link>
            {isPublished && (
              <Link
                href={`/blog/${item.matchedPost!.slug}`}
                className="admin-btn admin-btn--secondary admin-btn--small"
                target="_blank"
              >
                Xem bài viết
              </Link>
            )}
          </>
        ) : (
          <Link
            href={buildSeoPlanningHandoffUrl(item, campaign)}
            className="admin-btn admin-btn--primary admin-btn--small"
          >
            Tạo bài viết
          </Link>
        )}
      </div>
    </article>
  );
}

export function SeoPlanItemCardCompact({ item }: { item: SeoPlanItem }) {
  return (
    <div className="admin-seo-plan-item-compact">
      <strong>{item.title}</strong>
      <span className={`admin-cluster-priority ${priorityClass(item.priority)}`}>
        {SEO_PLAN_PRIORITY_LABELS[item.priority]}
      </span>
      <span className="admin-field-hint">{SEO_PLAN_STATUS_LABELS[item.status]}</span>
    </div>
  );
}
