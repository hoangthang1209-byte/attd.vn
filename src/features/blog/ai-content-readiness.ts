import {
  evaluateBlogReadiness,
  getReadinessLevel,
  type ReadinessSignal,
} from "@/features/blog/blog-readiness";
import type { BlogFaqItem } from "@/features/blog/types";

export type AiReadinessCheck = {
  label: string;
  ok: boolean;
  value: string;
};

export type AiContentReadinessResult = {
  level: "red" | "yellow" | "green";
  label: string;
  checks: AiReadinessCheck[];
  passedCount: number;
  totalCount: number;
  score: number;
};

const CHECK_CODES = [
  "WORD_COUNT",
  "H2_COUNT",
  "FAQ",
  "TAGS",
  "BODY_IMAGES",
  "CTA",
  "INTERNAL_LINKS",
  "META_TITLE",
  "META_DESCRIPTION",
];

/** Adapter over the canonical readiness evaluator — same numbers, same wording. */
export function calculateAiContentReadiness(input: {
  content: string;
  faqJson: BlogFaqItem[];
  tags: string[];
  metaTitle: string;
  metaDescription: string;
}): AiContentReadinessResult {
  const readiness = evaluateBlogReadiness({
    title: "",
    metaTitle: input.metaTitle,
    metaDescription: input.metaDescription,
    featuredImageUrl: null,
    content: input.content,
    faqJson: input.faqJson,
    tags: input.tags,
    server: null,
  });

  const byCode = new Map<string, ReadinessSignal>(readiness.signals.map((item) => [item.code, item]));
  const checks: AiReadinessCheck[] = CHECK_CODES.flatMap((code) => {
    const item = byCode.get(code);
    if (!item) return [];
    return [{ label: item.label, ok: item.ok, value: item.display }];
  });

  const passedCount = checks.filter((item) => item.ok).length;
  const totalCount = checks.length;
  const score = totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 0;

  return {
    ...getReadinessLevel(score),
    checks,
    passedCount,
    totalCount,
    score,
  };
}
