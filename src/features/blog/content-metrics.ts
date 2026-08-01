import { normalizeBlogContent } from "@/features/blog/content-normalizer";
import { countWordsFromHtml } from "@/features/blog/content-processor";
import { prepareBlogArticleContent } from "@/features/blog/prepare-content";
import type { BlogFaqItem } from "@/features/blog/types";

/**
 * Destinations that count as a commercial call to action.
 * Kept in sync with the writing engine CTA planner.
 */
const CTA_DESTINATIONS = ["/lien-he", "/contact", "/bao-gia", "/quote", "/dai-ly"];

export type BlogContentMetrics = {
  /** Public-equivalent HTML: normalized, heading ids applied, auto links applied. */
  html: string;
  wordCount: number;
  h2Count: number;
  h3Count: number;
  internalLinks: { authored: number; autoInjected: number; total: number };
  externalLinks: number;
  bodyImages: number;
  mediaReferences: number;
  faq: { inline: number; structured: number; total: number };
  cta: { present: boolean; source: "block" | "link" | "none" };
};

export type BlogContentMetricsInput = {
  content: string;
  faqJson?: BlogFaqItem[];
};

function countMatches(html: string, pattern: RegExp): number {
  return (html.match(pattern) ?? []).length;
}

function collectHrefs(html: string): string[] {
  return [...html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["']/gi)].map((match) => match[1]);
}

function isInternalHref(href: string): boolean {
  if (href.startsWith("/")) return !href.startsWith("/admin");
  return /^https?:\/\/(www\.)?attd\.vn\b/i.test(href);
}

function detectCta(html: string, hrefs: string[]): BlogContentMetrics["cta"] {
  if (/class="[^"]*(blog-cta-block|writing-cta)[^"]*"/i.test(html)) {
    return { present: true, source: "block" };
  }
  const ctaLink = hrefs.some((href) =>
    CTA_DESTINATIONS.some((destination) => href.toLowerCase().startsWith(destination))
  );
  return ctaLink ? { present: true, source: "link" } : { present: false, source: "none" };
}

/**
 * The single content analyzer. Every readiness surface — SEO score, editor
 * indicators, publish readiness — reads its numbers from here so the UI can
 * never show two different counts for the same article.
 */
export function analyzeBlogContent(input: BlogContentMetricsInput): BlogContentMetrics {
  const raw = input.content?.trim() ?? "";
  const structuredFaq = (input.faqJson ?? []).filter(
    (item) => item?.question?.trim() && item?.answer?.trim()
  ).length;

  if (!raw) {
    return {
      html: "",
      wordCount: 0,
      h2Count: 0,
      h3Count: 0,
      internalLinks: { authored: 0, autoInjected: 0, total: 0 },
      externalLinks: 0,
      bodyImages: 0,
      mediaReferences: 0,
      faq: { inline: 0, structured: structuredFaq, total: structuredFaq },
      cta: { present: false, source: "none" },
    };
  }

  const normalized = normalizeBlogContent(raw);
  const prepared = prepareBlogArticleContent(normalized);
  const html = prepared.html;

  const authoredHrefs = collectHrefs(normalized);
  const authoredInternal = authoredHrefs.filter(isInternalHref).length;
  const externalLinks = authoredHrefs.filter((href) => !isInternalHref(href) && /^https?:/i.test(href)).length;

  const inlineFaq = countMatches(html, /class="[^"]*blog-inline-faq__item[^"]*"/gi);

  return {
    html,
    wordCount: countWordsFromHtml(html),
    h2Count: countMatches(html, /<h2[\s>]/gi),
    h3Count: countMatches(html, /<h3[\s>]/gi),
    internalLinks: {
      authored: authoredInternal,
      autoInjected: prepared.internalLinkCount,
      total: authoredInternal + prepared.internalLinkCount,
    },
    externalLinks,
    bodyImages: countMatches(html, /<img[\s>]/gi),
    mediaReferences: countMatches(html, /data-media-id=/gi),
    faq: {
      inline: inlineFaq,
      structured: structuredFaq,
      total: inlineFaq + structuredFaq,
    },
    cta: detectCta(html, collectHrefs(html)),
  };
}
