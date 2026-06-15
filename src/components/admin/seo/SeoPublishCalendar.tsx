import Link from "next/link";
import type { SeoCampaign, SeoPlanCalendar } from "@/features/blog/seo-planning-types";
import { buildSeoPlanningHandoffUrl } from "@/features/blog/seo-planning";
import {
  SEO_PLAN_PRIORITY_LABELS,
  SEO_PLAN_STATUS_LABELS,
} from "@/features/blog/seo-planning-status";

type SeoPublishCalendarProps = {
  calendar: SeoPlanCalendar;
  campaign: SeoCampaign;
};

function priorityClass(priority: string): string {
  if (priority === "HIGH") return "admin-cluster-priority--high";
  if (priority === "MEDIUM") return "admin-cluster-priority--medium";
  return "admin-cluster-priority--low";
}

export default function SeoPublishCalendar({ calendar, campaign }: SeoPublishCalendarProps) {
  return (
    <div className="admin-seo-calendar">
      {calendar.weeks.map((week) => (
        <section key={week.week} className="admin-cluster-roadmap-week">
          <p className="admin-cluster-roadmap-week-label">{week.label}</p>
          <ul className="admin-cluster-roadmap-list">
            {week.items.map((item, index) => (
              <li key={item.id}>
                {index + 1}. {item.title}
                <span className={`admin-cluster-priority ${priorityClass(item.priority)}`}>
                  {SEO_PLAN_PRIORITY_LABELS[item.priority]}
                </span>
                <span className="admin-field-hint">{SEO_PLAN_STATUS_LABELS[item.status]}</span>
                {item.matchedPost ? (
                  <Link
                    href={`/admin/blog/${item.matchedPost.id}`}
                    className="admin-btn admin-btn--secondary admin-btn--small"
                  >
                    Sửa bài viết
                  </Link>
                ) : (
                  <Link
                    href={buildSeoPlanningHandoffUrl(item, campaign)}
                    className="admin-btn admin-btn--primary admin-btn--small"
                  >
                    Tạo bài viết
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
