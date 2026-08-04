/**
 * Sprint 16.1 — heuristic, network-free "quality chips" for a section.
 *
 * These are cheap client-side signals to help an editor decide whether to
 * ask the AI for help — not a replacement for the governed Writing QA
 * pipeline (`writing-engine`'s QA service), which remains the source of
 * truth for pass/fail gating.
 */

import { htmlToPlainForDiff } from "@/features/content-generation/ux/text-diff";

export type QualityChipTone = "ok" | "warn" | "missing";

export type QualityChip = {
  id: string;
  label: string;
  score: number | null;
  tone: QualityChipTone;
};

export type SectionQaIssueLike = {
  code?: string;
  severity?: string;
  message?: string;
};

export type SectionForQuality = {
  html?: string | null;
  plainText?: string | null;
  wordCount?: number | null;
  factIds?: string[] | null;
  hasCta?: boolean | null;
  hasLinks?: boolean | null;
  hasMedia?: boolean | null;
  qaIssues?: SectionQaIssueLike[] | null;
};

function toneFromScore(score: number | null): QualityChipTone {
  if (score == null) return "missing";
  if (score >= 70) return "ok";
  if (score >= 40) return "warn";
  return "missing";
}

function hasIssueMatching(issues: SectionQaIssueLike[], needle: string): boolean {
  const upper = needle.toUpperCase();
  return issues.some((issue) => (issue.code ?? "").toUpperCase().includes(upper));
}

/**
 * Word-count based heuristics deliberately favor the sweet spot most
 * SEO-facing sections land in (roughly 100-500 words); very short sections
 * read as thin content, very long ones may need splitting.
 */
export function computeSectionQualityChips(section: SectionForQuality): QualityChip[] {
  const plain = section.plainText ?? (section.html ? htmlToPlainForDiff(section.html) : "");
  const wordCount = section.wordCount ?? (plain ? plain.split(/\s+/).filter(Boolean).length : 0);
  const factCount = section.factIds?.length ?? 0;
  const hasCta = section.hasCta ?? false;
  const hasLinks = section.hasLinks ?? (section.html ? /<a[\s>]/i.test(section.html) : false);
  const hasMedia = section.hasMedia ?? (section.html ? /<img[\s>]/i.test(section.html) : false);
  const qaIssues = section.qaIssues ?? [];

  let seoScore: number | null = null;
  if (wordCount > 0) {
    if (wordCount < 40) seoScore = 20;
    else if (wordCount < 100) seoScore = 55;
    else if (wordCount <= 500) seoScore = 90;
    else seoScore = 70;
  }
  if (hasIssueMatching(qaIssues, "SEO")) {
    seoScore = seoScore == null ? 30 : Math.min(seoScore, 40);
  }

  let readabilityScore: number | null = null;
  if (wordCount > 0) {
    readabilityScore = wordCount < 30 ? 40 : wordCount <= 300 ? 85 : 60;
  }
  if (hasIssueMatching(qaIssues, "READAB")) {
    readabilityScore = readabilityScore == null ? 30 : Math.min(readabilityScore, 40);
  }

  const evidenceScore = factCount === 0 ? null : Math.min(100, 40 + factCount * 20);
  const ctaScore = hasCta ? 100 : null;
  const linksScore = hasLinks ? 100 : null;
  const mediaScore = hasMedia ? 100 : null;

  return [
    { id: "seo", label: "SEO", score: seoScore, tone: toneFromScore(seoScore) },
    { id: "readability", label: "Readability", score: readabilityScore, tone: toneFromScore(readabilityScore) },
    { id: "evidence", label: "Evidence", score: evidenceScore, tone: toneFromScore(evidenceScore) },
    { id: "cta", label: "CTA", score: ctaScore, tone: ctaScore == null ? "missing" : "ok" },
    { id: "internal-links", label: "Internal Links", score: linksScore, tone: linksScore == null ? "missing" : "ok" },
    { id: "media", label: "Media", score: mediaScore, tone: mediaScore == null ? "missing" : "ok" },
  ];
}
