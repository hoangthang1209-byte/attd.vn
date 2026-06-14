import {
  countH2,
  countWordsFromHtml,
} from "@/features/blog/content-processor";
import { countPotentialInternalLinks } from "@/features/blog/internal-links";
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

export function calculateSeoScore(input: SeoScoreInput): SeoScoreResult {
  let score = 0;
  const checklist: SeoChecklistItem[] = [];

  const hasMetaTitle = Boolean(input.metaTitle.trim() || input.title.trim());
  if (hasMetaTitle) score += 20;
  checklist.push({ label: "Có Meta Title", ok: Boolean(input.metaTitle.trim()) });

  const hasMetaDescription = Boolean(input.metaDescription.trim());
  if (hasMetaDescription) score += 15;
  checklist.push({ label: "Có Meta Description", ok: hasMetaDescription });

  const hasFeaturedImage = Boolean(input.featuredImageUrl?.trim());
  if (hasFeaturedImage) score += 15;
  checklist.push({ label: "Có Featured Image", ok: hasFeaturedImage });

  const wordCount = countWordsFromHtml(input.content);
  const longContent = wordCount > 1200;
  if (longContent) score += 15;
  checklist.push({ label: "Nội dung > 1200 từ", ok: longContent });

  const faq = input.faqJson.filter((item) => item.question.trim() && item.answer.trim());
  const hasFaq = faq.length > 0;
  if (hasFaq) score += 10;
  checklist.push({ label: "Có FAQ", ok: hasFaq });

  const tags = input.tags.filter(Boolean);
  const hasTags = tags.length > 0;
  if (hasTags) score += 5;
  checklist.push({ label: "Có Tags", ok: hasTags });

  const h2Count = countH2(input.content);
  const enoughH2 = h2Count >= 3;
  if (enoughH2) score += 10;
  checklist.push({ label: "Có ít nhất 3 H2", ok: enoughH2 });

  const internalLinks = countPotentialInternalLinks(input.content);
  const enoughLinks = internalLinks >= 3;
  if (enoughLinks) score += 10;
  checklist.push({
    label: "Internal links >= 3",
    ok: enoughLinks,
  });

  const level = score <= 50 ? "red" : score <= 80 ? "yellow" : "green";

  return { score, level, checklist };
}
