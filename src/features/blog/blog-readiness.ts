import { analyzeBlogContent, type BlogContentMetrics } from "@/features/blog/content-metrics";
import type { BlogFaqItem } from "@/features/blog/types";

export type ReadinessSeverity = "BLOCKER" | "WARNING";
export type ReadinessGroup = "EDITORIAL" | "SEO" | "CONTENT" | "MEDIA";
export type ReadinessStatus = "READY" | "BLOCKED" | "UNKNOWN";

export type ReadinessSignal = {
  code: string;
  group: ReadinessGroup;
  severity: ReadinessSeverity;
  label: string;
  /** Short value shown next to the label, e.g. "0 / Recommended 3". */
  display: string;
  ok: boolean;
  hint?: string;
};

export type BlogQualityScore = {
  score: number;
  level: "red" | "yellow" | "green";
  label: string;
};

export type BlogReadinessResult = {
  status: ReadinessStatus;
  statusLabel: string;
  blockers: ReadinessSignal[];
  warnings: ReadinessSignal[];
  signals: ReadinessSignal[];
  metrics: BlogContentMetrics;
  quality: BlogQualityScore;
  /** True when server-side governance gates were evaluated for this post. */
  serverChecked: boolean;
};

export type ServerReadinessInput = {
  ready: boolean;
  errors: string[];
  warnings: string[];
};

export type BlogReadinessInput = {
  title: string;
  slug?: string;
  metaTitle: string;
  metaDescription: string;
  excerpt?: string;
  featuredImageUrl: string | null;
  ogImageUrl?: string | null;
  content: string;
  faqJson: BlogFaqItem[];
  tags: string[];
  /** Server governance verdict from /publish-readiness. Authoritative when present. */
  server?: ServerReadinessInput | null;
  /** Editor has unsaved changes, so the server verdict may be stale. */
  dirty?: boolean;
};

/** Single source of truth for "how much is enough". */
export const READINESS_THRESHOLDS = {
  wordCount: { required: 0, recommended: 1200 },
  h2Count: { required: 0, recommended: 3 },
  internalLinks: { required: 0, recommended: 3 },
  faq: { required: 0, recommended: 3 },
  tags: { required: 0, recommended: 3 },
  bodyImages: { required: 0, recommended: 1 },
  metaDescriptionChars: { required: 1, recommended: 50 },
} as const;

type Threshold = { required: number; recommended: number };

/**
 * "0 / Required 3" when the metric blocks publishing, "4 / Recommended 3"
 * when it is only advice. The two never look alike.
 */
export function formatThreshold(value: number, threshold: Threshold): string {
  if (threshold.required > 0) {
    return `${value} / Required ${threshold.required}`;
  }
  return `${value} / Recommended ${threshold.recommended}`;
}

function signal(input: ReadinessSignal): ReadinessSignal {
  return input;
}

/** Content-quality banding. Says nothing about publishing eligibility. */
export function getReadinessLevel(score: number): { level: "red" | "yellow" | "green"; label: string } {
  if (score >= 90) return { level: "green", label: "Chất lượng tốt" };
  if (score >= 60) return { level: "yellow", label: "Gần hoàn thiện" };
  return { level: "red", label: "Cần bổ sung" };
}

function qualityFromScore(score: number): BlogQualityScore {
  return { score, ...getReadinessLevel(score) };
}

function buildClientSignals(
  input: BlogReadinessInput,
  metrics: BlogContentMetrics
): ReadinessSignal[] {
  const hasTitle = Boolean(input.title.trim());
  const hasSlug = input.slug === undefined ? true : Boolean(input.slug.trim());
  const hasContent = metrics.wordCount > 0;
  const hasMetaTitle = Boolean(input.metaTitle.trim());
  const metaDescription = input.metaDescription.trim();
  const hasFeaturedImage = Boolean(input.featuredImageUrl?.trim());
  const tagCount = input.tags.filter(Boolean).length;

  return [
    signal({
      code: "TITLE",
      group: "EDITORIAL",
      severity: "BLOCKER",
      label: "Tiêu đề",
      display: hasTitle ? "Đã có" : "Thiếu tiêu đề",
      ok: hasTitle,
    }),
    signal({
      code: "SLUG",
      group: "SEO",
      severity: "BLOCKER",
      label: "Slug",
      display: hasSlug ? "Đã có" : "Thiếu slug",
      ok: hasSlug,
    }),
    signal({
      code: "CONTENT",
      group: "CONTENT",
      severity: "BLOCKER",
      label: "Nội dung",
      display: hasContent ? `${metrics.wordCount.toLocaleString("vi-VN")} từ` : "Chưa có nội dung",
      ok: hasContent,
    }),
    signal({
      code: "META_TITLE",
      group: "SEO",
      severity: "BLOCKER",
      label: "Meta title",
      display: hasMetaTitle ? "Đã có" : "Meta Title Missing",
      ok: hasMetaTitle,
    }),
    signal({
      code: "META_DESCRIPTION",
      group: "SEO",
      severity: "BLOCKER",
      label: "Meta description",
      display: metaDescription ? `${metaDescription.length} ký tự` : "Meta Description Missing",
      ok: Boolean(metaDescription),
    }),
    signal({
      code: "FEATURED_IMAGE",
      group: "MEDIA",
      severity: "BLOCKER",
      label: "Featured Image",
      display: hasFeaturedImage ? "Đã có" : "Featured Image Missing",
      ok: hasFeaturedImage,
    }),
    signal({
      code: "META_DESCRIPTION_LENGTH",
      group: "SEO",
      severity: "WARNING",
      label: "Độ dài meta description",
      display: formatThreshold(metaDescription.length, READINESS_THRESHOLDS.metaDescriptionChars),
      ok: metaDescription.length >= READINESS_THRESHOLDS.metaDescriptionChars.recommended,
    }),
    signal({
      code: "OG_IMAGE",
      group: "SEO",
      severity: "WARNING",
      label: "OG Image",
      display: input.ogImageUrl?.trim() ? "Đã có" : "OG Image Missing",
      ok: Boolean(input.ogImageUrl?.trim()),
      hint: "Không bắt buộc — mặc định dùng Featured Image.",
    }),
    signal({
      code: "WORD_COUNT",
      group: "CONTENT",
      severity: "WARNING",
      label: "Word count",
      display: formatThreshold(metrics.wordCount, READINESS_THRESHOLDS.wordCount),
      ok: metrics.wordCount >= READINESS_THRESHOLDS.wordCount.recommended,
    }),
    signal({
      code: "H2_COUNT",
      group: "CONTENT",
      severity: "WARNING",
      label: "H2 headings",
      display: formatThreshold(metrics.h2Count, READINESS_THRESHOLDS.h2Count),
      ok: metrics.h2Count >= READINESS_THRESHOLDS.h2Count.recommended,
    }),
    signal({
      code: "INTERNAL_LINKS",
      group: "SEO",
      severity: "WARNING",
      label: "Internal links",
      display: formatThreshold(metrics.internalLinks.total, READINESS_THRESHOLDS.internalLinks),
      ok: metrics.internalLinks.total >= READINESS_THRESHOLDS.internalLinks.recommended,
      hint:
        metrics.internalLinks.autoInjected > 0
          ? `${metrics.internalLinks.authored} liên kết trong bài + ${metrics.internalLinks.autoInjected} tự động.`
          : undefined,
    }),
    signal({
      code: "CTA",
      group: "CONTENT",
      severity: "WARNING",
      label: "CTA",
      display: metrics.cta.present ? "CTA Ready" : "CTA Missing",
      ok: metrics.cta.present,
    }),
    signal({
      code: "FAQ",
      group: "CONTENT",
      severity: "WARNING",
      label: "FAQ",
      display: formatThreshold(metrics.faq.total, READINESS_THRESHOLDS.faq),
      ok: metrics.faq.total >= READINESS_THRESHOLDS.faq.recommended,
    }),
    signal({
      code: "BODY_IMAGES",
      group: "MEDIA",
      severity: "WARNING",
      label: "Body Images",
      display: formatThreshold(metrics.bodyImages, READINESS_THRESHOLDS.bodyImages),
      ok: metrics.bodyImages >= READINESS_THRESHOLDS.bodyImages.recommended,
      hint: "Ảnh trong thân bài, không tính Featured Image.",
    }),
    signal({
      code: "TAGS",
      group: "SEO",
      severity: "WARNING",
      label: "Tags",
      display: formatThreshold(tagCount, READINESS_THRESHOLDS.tags),
      ok: tagCount >= READINESS_THRESHOLDS.tags.recommended,
    }),
  ];
}

/** Weighted quality score, derived from the same metrics the panels display. */
function computeQualityScore(input: BlogReadinessInput, metrics: BlogContentMetrics): number {
  let score = 0;
  if (input.metaTitle.trim()) score += 20;
  if (input.metaDescription.trim()) score += 15;
  if (input.featuredImageUrl?.trim()) score += 15;
  if (metrics.wordCount >= READINESS_THRESHOLDS.wordCount.recommended) score += 15;
  if (metrics.h2Count >= READINESS_THRESHOLDS.h2Count.recommended) score += 10;
  if (metrics.internalLinks.total >= READINESS_THRESHOLDS.internalLinks.recommended) score += 10;
  if (metrics.faq.total > 0) score += 10;
  if (input.tags.filter(Boolean).length > 0) score += 5;
  return Math.min(100, score);
}

function serverSignal(message: string, severity: ReadinessSeverity, index: number): ReadinessSignal {
  return {
    code: `SERVER_${severity}_${index}`,
    group: "EDITORIAL",
    severity,
    label: message,
    display: severity === "BLOCKER" ? "Blocker" : "Warning",
    ok: false,
  };
}

/**
 * The canonical readiness evaluator. Every surface — SEO sidebar, publishing
 * panel, editor header — renders this one result, so Publishing Readiness can
 * never disagree with the indicators next to it.
 *
 * Server governance gates stay authoritative for blockers; local content
 * checks contribute warnings and, before the first save, provisional blockers.
 */
export function evaluateBlogReadiness(input: BlogReadinessInput): BlogReadinessResult {
  const metrics = analyzeBlogContent({ content: input.content, faqJson: input.faqJson });
  const signals = buildClientSignals(input, metrics);
  const quality = qualityFromScore(computeQualityScore(input, metrics));

  const localBlockers = signals.filter((item) => item.severity === "BLOCKER" && !item.ok);
  const localWarnings = signals.filter((item) => item.severity === "WARNING" && !item.ok);

  if (!input.server) {
    return {
      status: localBlockers.length > 0 ? "BLOCKED" : "UNKNOWN",
      statusLabel: localBlockers.length > 0 ? "BLOCKED" : "Chưa kiểm tra",
      blockers: localBlockers,
      warnings: localWarnings,
      signals,
      metrics,
      quality,
      serverChecked: false,
    };
  }

  const blockers = input.server.errors.map((message, index) => serverSignal(message, "BLOCKER", index));
  const warnings = [
    ...input.server.warnings.map((message, index) => serverSignal(message, "WARNING", index)),
    ...localWarnings,
  ];

  if (input.dirty) {
    warnings.unshift({
      code: "UNSAVED_CHANGES",
      group: "EDITORIAL",
      severity: "WARNING",
      label: "Có thay đổi chưa lưu",
      display: "Lưu để kiểm tra lại",
      ok: false,
    });
  }

  const ready = input.server.ready && blockers.length === 0;

  return {
    status: ready ? "READY" : "BLOCKED",
    statusLabel: ready ? "READY" : "BLOCKED",
    blockers,
    warnings,
    signals,
    metrics,
    quality,
    serverChecked: true,
  };
}

/**
 * Content-quality warnings for the server publish-readiness response, built
 * from the same thresholds the editor shows. Never blockers.
 */
export function buildContentQualityWarnings(input: {
  content: string;
  faqJson: BlogFaqItem[];
  tags: string[];
}): string[] {
  const metrics = analyzeBlogContent({ content: input.content, faqJson: input.faqJson });
  const warnings: string[] = [];

  if (metrics.wordCount < READINESS_THRESHOLDS.wordCount.recommended) {
    warnings.push(
      `Word count ${formatThreshold(metrics.wordCount, READINESS_THRESHOLDS.wordCount)} (cảnh báo)`
    );
  }
  if (metrics.h2Count < READINESS_THRESHOLDS.h2Count.recommended) {
    warnings.push(`H2 headings ${formatThreshold(metrics.h2Count, READINESS_THRESHOLDS.h2Count)} (cảnh báo)`);
  }
  if (metrics.internalLinks.total < READINESS_THRESHOLDS.internalLinks.recommended) {
    warnings.push(
      `Internal links ${formatThreshold(metrics.internalLinks.total, READINESS_THRESHOLDS.internalLinks)} (cảnh báo)`
    );
  }
  if (!metrics.cta.present) {
    warnings.push("CTA Missing (cảnh báo)");
  }
  if (metrics.bodyImages < READINESS_THRESHOLDS.bodyImages.recommended) {
    warnings.push("Body Images Missing (cảnh báo)");
  }

  return warnings;
}
