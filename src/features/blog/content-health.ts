import { countH2InContent, countWordsInContent } from "@/features/blog/word-count";
import { internalLinkCount } from "@/features/blog/seo-score-utils";
import type { BlogFaqItem } from "@/features/blog/types";

export type ContentHealthMetric = {
  label: string;
  value: number;
  ok: boolean;
  target?: number;
};

export type ContentHealthResult = {
  metrics: ContentHealthMetric[];
};

function countMarkdownImages(content: string): number {
  const markdownImages = content.match(/!\[[^\]]*]\([^)]+\)/g) ?? [];
  const htmlImages = content.match(/<img[\s>]/gi) ?? [];
  return markdownImages.length + htmlImages.length;
}

function countInlineFaqs(content: string): number {
  return (content.match(/:::faq[\s\S]*?:::/g) ?? []).length;
}

export function calculateContentHealth(
  content: string,
  faqJson: BlogFaqItem[],
  tags: string[]
): ContentHealthResult {
  const words = countWordsInContent(content);
  const h2 = countH2InContent(content);
  const images = countMarkdownImages(content);
  const links = internalLinkCount(content);
  const faqs = countInlineFaqs(content) + faqJson.filter((item) => item.question && item.answer).length;
  const tagCount = tags.filter(Boolean).length;

  return {
    metrics: [
      { label: "Words", value: words, ok: words >= 1200, target: 1200 },
      { label: "H2", value: h2, ok: h2 >= 3, target: 3 },
      { label: "Images", value: images, ok: images >= 1, target: 1 },
      { label: "Internal Links", value: links, ok: links >= 3, target: 3 },
      { label: "FAQs", value: faqs, ok: faqs >= 1, target: 1 },
      { label: "Tags", value: tagCount, ok: tagCount >= 1, target: 1 },
    ],
  };
}

export type PublishReadiness = {
  level: "red" | "yellow" | "green";
  label: string;
};

export function getPublishReadiness(score: number): PublishReadiness {
  if (score >= 81) {
    return { level: "green", label: "Ready to publish" };
  }
  if (score >= 51) {
    return { level: "yellow", label: "Almost ready" };
  }
  return { level: "red", label: "Needs work" };
}
