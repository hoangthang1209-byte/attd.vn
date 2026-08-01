import { READINESS_THRESHOLDS, formatThreshold } from "@/features/blog/blog-readiness";
import { analyzeBlogContent } from "@/features/blog/content-metrics";
import type { BlogFaqItem } from "@/features/blog/types";

export type ContentHealthMetric = {
  label: string;
  value: number;
  ok: boolean;
  target?: number;
  /** Pre-formatted "X / Recommended Y" so every surface reads identically. */
  display: string;
};

export type ContentHealthResult = {
  metrics: ContentHealthMetric[];
};

/** Adapter over the canonical content analyzer — no separate counting rules. */
export function calculateContentHealth(
  content: string,
  faqJson: BlogFaqItem[],
  tags: string[]
): ContentHealthResult {
  const metrics = analyzeBlogContent({ content, faqJson });
  const tagCount = tags.filter(Boolean).length;

  const rows: Array<{ label: string; value: number; threshold: { required: number; recommended: number } }> = [
    { label: "Words", value: metrics.wordCount, threshold: READINESS_THRESHOLDS.wordCount },
    { label: "H2", value: metrics.h2Count, threshold: READINESS_THRESHOLDS.h2Count },
    { label: "Body Images", value: metrics.bodyImages, threshold: READINESS_THRESHOLDS.bodyImages },
    {
      label: "Internal Links",
      value: metrics.internalLinks.total,
      threshold: READINESS_THRESHOLDS.internalLinks,
    },
    { label: "FAQs", value: metrics.faq.total, threshold: READINESS_THRESHOLDS.faq },
    { label: "Tags", value: tagCount, threshold: READINESS_THRESHOLDS.tags },
  ];

  return {
    metrics: rows.map((row) => ({
      label: row.label,
      value: row.value,
      ok: row.value >= row.threshold.recommended,
      target: row.threshold.recommended,
      display: formatThreshold(row.value, row.threshold),
    })),
  };
}

export type PublishReadiness = {
  level: "red" | "yellow" | "green";
  label: string;
};

/**
 * Content-quality label for a 0–100 score. It intentionally says nothing about
 * publishing: Publishing Readiness comes only from `evaluateBlogReadiness`.
 */
export function getPublishReadiness(score: number): PublishReadiness {
  if (score >= 90) return { level: "green", label: "Chất lượng tốt" };
  if (score >= 60) return { level: "yellow", label: "Gần hoàn thiện" };
  return { level: "red", label: "Cần bổ sung" };
}
