"use client";

import type { BlogFaqItem } from "@/features/blog/types";
import { calculateContentHealth, getPublishReadiness } from "@/features/blog/content-health";
import { calculateSeoScore } from "@/features/blog/seo-score";
import { countWordsInContent } from "@/features/blog/word-count";
import { SITE_NAME } from "@/lib/seo";

type BlogSeoPanelProps = {
  title: string;
  slug: string;
  metaTitle: string;
  metaDescription: string;
  excerpt: string;
  featuredImageUrl: string | null;
  content: string;
  faqJson: BlogFaqItem[];
  tags: string[];
};

export default function BlogSeoPanel(props: BlogSeoPanelProps) {
  const result = calculateSeoScore(props);
  const readiness = getPublishReadiness(result.score);
  const health = calculateContentHealth(props.content, props.faqJson, props.tags);
  const wordCount = countWordsInContent(props.content);
  const serpTitle = props.metaTitle.trim() || `${props.title.trim() || "Tiêu đề bài viết"} | ${SITE_NAME}`;
  const serpDescription =
    props.metaDescription.trim() ||
    props.excerpt.trim() ||
    "Mô tả meta description sẽ hiển thị trên Google.";
  const serpUrl = `attd.vn › blog › ${props.slug.trim() || "slug-bai-viet"}`;

  return (
    <div className="admin-sidebar-card admin-seo-panel">
      <h3 className="admin-sidebar-title">SEO Score</h3>
      <p className={`admin-seo-score admin-seo-score--${result.level}`}>
        SEO Score: {result.score}/100
      </p>
      <p className={`admin-publish-readiness admin-publish-readiness--${readiness.level}`}>
        {readiness.label}
      </p>
      <p className="admin-seo-word-count">{wordCount.toLocaleString("vi-VN")} từ</p>

      <div className="admin-content-health">
        <p className="admin-content-health-title">Content Health</p>
        <ul className="admin-content-health-list">
          {health.metrics.map((metric) => (
            <li key={metric.label} className={metric.ok ? "is-ok" : ""}>
              {metric.label}: {metric.value.toLocaleString("vi-VN")} {metric.ok ? "✓" : "○"}
            </li>
          ))}
        </ul>
      </div>

      <div className="admin-serp-preview">
        <p className="admin-serp-preview-label">Google Search Preview</p>
        <div className="admin-serp-card">
          <p className="admin-serp-url">{serpUrl}</p>
          <p className="admin-serp-title">{serpTitle}</p>
          <p className="admin-serp-description">{serpDescription}</p>
        </div>
      </div>

      <ul className="admin-seo-checklist">
        {result.checklist.map((item) => (
          <li key={item.label} className={item.ok ? "admin-seo-checklist-item--ok" : ""}>
            {item.ok ? "✓" : "○"} {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
