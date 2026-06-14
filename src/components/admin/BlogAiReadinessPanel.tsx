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
    <div className="admin-sidebar-card admin-ai-readiness">
      <h3 className="admin-sidebar-title">AI Content Readiness</h3>
      <p className={`admin-publish-readiness admin-publish-readiness--${result.level}`}>
        {result.label}
      </p>
      <p className="admin-field-hint">
        {result.passedCount}/{result.totalCount} checks passed
      </p>
      <ul className="admin-ai-readiness-list">
        {result.checks.map((check) => (
          <li key={check.label} className={check.ok ? "is-ok" : ""}>
            {check.ok ? "✓" : "○"} {check.label}: {check.value}
          </li>
        ))}
      </ul>
    </div>
  );
}
