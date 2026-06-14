"use client";

import type { BlogFaqItem } from "@/features/blog/types";
import { calculateSeoScore } from "@/features/blog/seo-score";

type BlogSeoPanelProps = {
  title: string;
  metaTitle: string;
  metaDescription: string;
  featuredImageUrl: string | null;
  content: string;
  faqJson: BlogFaqItem[];
  tags: string[];
};

export default function BlogSeoPanel(props: BlogSeoPanelProps) {
  const result = calculateSeoScore(props);

  return (
    <div className="admin-sidebar-card admin-seo-panel">
      <h3 className="admin-sidebar-title">SEO Score</h3>
      <p className={`admin-seo-score admin-seo-score--${result.level}`}>
        SEO Score: {result.score}/100
      </p>
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
