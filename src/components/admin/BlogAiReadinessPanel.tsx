"use client";

import { calculateAiContentReadiness } from "@/features/blog/ai-content-readiness";
import type { BlogFaqItem } from "@/features/blog/types";

type BlogAiReadinessPanelProps = {
  content: string;
  faqJson: BlogFaqItem[];
  tags: string[];
  metaTitle: string;
  metaDescription: string;
};

export default function BlogAiReadinessPanel(props: BlogAiReadinessPanelProps) {
  const result = calculateAiContentReadiness(props);

  return (
    <div className="admin-ai-readiness">
      <p className={`admin-publish-readiness admin-publish-readiness--${result.level}`}>
        {result.label}
      </p>
      <p className="admin-field-hint">
        {result.passedCount}/{result.totalCount} khuyến nghị đạt · {result.score}/100
      </p>
      <ul className="admin-ai-readiness-list">
        {result.checks.map((check) => (
          <li key={check.label} className={check.ok ? "is-ok" : ""}>
            <span>
              {check.ok ? "✓" : "○"} {check.label}
            </span>
            <span>{check.value}</span>
          </li>
        ))}
      </ul>
      <p className="admin-field-hint">
        Đây là gợi ý của AI, không phải điều kiện chặn xuất bản.
      </p>
    </div>
  );
}
