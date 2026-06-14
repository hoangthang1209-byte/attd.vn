import { getPublishReadiness } from "@/features/blog/content-health";
import { internalLinkCount } from "@/features/blog/seo-score-utils";
import { countH2InContent, countWordsInContent } from "@/features/blog/word-count";
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

function countInlineFaqs(content: string): number {
  return (content.match(/:::faq[\s\S]*?:::/g) ?? []).length;
}

function countImages(content: string): number {
  const markdownImages = content.match(/!\[[^\]]*]\([^)]+\)/g) ?? [];
  const htmlImages = content.match(/<img[\s>]/gi) ?? [];
  return markdownImages.length + htmlImages.length;
}

function hasCtaBlock(content: string): boolean {
  return /:::cta[\s\S]*?:::/.test(content);
}

export function calculateAiContentReadiness(input: {
  content: string;
  faqJson: BlogFaqItem[];
  tags: string[];
  metaTitle: string;
  metaDescription: string;
}): AiContentReadinessResult {
  const words = countWordsInContent(input.content);
  const h2 = countH2InContent(input.content);
  const inlineFaqs = countInlineFaqs(input.content);
  const builderFaqs = input.faqJson.filter((f) => f.question?.trim() && f.answer?.trim()).length;
  const faqTotal = inlineFaqs + builderFaqs;
  const tagCount = input.tags.filter(Boolean).length;
  const images = countImages(input.content);
  const links = internalLinkCount(input.content);
  const cta = hasCtaBlock(input.content);
  const hasMetaTitle = Boolean(input.metaTitle.trim());
  const hasMetaDescription = Boolean(input.metaDescription.trim());

  const checks: AiReadinessCheck[] = [
    { label: "Word count", ok: words >= 1200, value: words.toLocaleString("vi-VN") },
    { label: "H2 count", ok: h2 >= 6, value: String(h2) },
    { label: "FAQ count", ok: faqTotal >= 3, value: String(faqTotal) },
    { label: "Tags count", ok: tagCount >= 3, value: String(tagCount) },
    { label: "Images count", ok: images >= 1, value: String(images) },
    { label: "CTA exists", ok: cta, value: cta ? "Yes" : "No" },
    { label: "Internal links", ok: links >= 3, value: String(links) },
    { label: "Meta title", ok: hasMetaTitle, value: hasMetaTitle ? "Set" : "Missing" },
    { label: "Meta description", ok: hasMetaDescription, value: hasMetaDescription ? "Set" : "Missing" },
  ];

  const passedCount = checks.filter((c) => c.ok).length;
  const totalCount = checks.length;
  const score = Math.round((passedCount / totalCount) * 100);
  const readiness = getPublishReadiness(score);

  return {
    level: readiness.level,
    label: readiness.label,
    checks,
    passedCount,
    totalCount,
    score,
  };
}
