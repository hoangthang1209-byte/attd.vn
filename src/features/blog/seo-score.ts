import { evaluateBlogReadiness, type ReadinessSignal } from "@/features/blog/blog-readiness";
import type { BlogFaqItem } from "@/features/blog/types";

export type SeoChecklistItem = {
  label: string;
  ok: boolean;
};

export type SeoScoreResult = {
  score: number;
  level: "red" | "yellow" | "green";
  checklist: SeoChecklistItem[];
};

export type SeoScoreInput = {
  title: string;
  metaTitle: string;
  metaDescription: string;
  featuredImageUrl: string | null;
  content: string;
  faqJson: BlogFaqItem[];
  tags: string[];
};

const SIGNAL_CHECKLIST: Array<{ code: string; label: string }> = [
  { code: "META_TITLE", label: "Có Meta Title" },
  { code: "META_DESCRIPTION", label: "Có Meta Description" },
  { code: "FEATURED_IMAGE", label: "Có Featured Image" },
  { code: "WORD_COUNT", label: "Nội dung > 1200 từ" },
  { code: "H2_COUNT", label: "Có ít nhất 3 H2" },
  { code: "INTERNAL_LINKS", label: "Internal links >= 3" },
];

/** Adapter over the canonical readiness evaluator — no separate scoring rules. */
export function calculateSeoScore(input: SeoScoreInput): SeoScoreResult {
  const readiness = evaluateBlogReadiness({
    title: input.title,
    metaTitle: input.metaTitle,
    metaDescription: input.metaDescription,
    featuredImageUrl: input.featuredImageUrl,
    content: input.content,
    faqJson: input.faqJson,
    tags: input.tags,
    server: null,
  });

  const byCode = new Map<string, ReadinessSignal>(readiness.signals.map((item) => [item.code, item]));

  return {
    score: readiness.quality.score,
    level: readiness.quality.level,
    checklist: [
      ...SIGNAL_CHECKLIST.map((entry) => ({
        label: entry.label,
        ok: byCode.get(entry.code)?.ok ?? false,
      })),
      { label: "Có FAQ", ok: readiness.metrics.faq.total > 0 },
      { label: "Có Tags", ok: input.tags.filter(Boolean).length > 0 },
    ],
  };
}
