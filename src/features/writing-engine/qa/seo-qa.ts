import type { WritingPlan, WritingQaIssue, WritingSectionDraft } from "@/features/writing-engine/writing-engine.types";
import { countWords } from "@/features/writing-engine/writing-utils";

export function runSeoQa(plan: WritingPlan, sections: WritingSectionDraft[]): WritingQaIssue[] {
  const issues: WritingQaIssue[] = [];
  const totalWords = sections.reduce((sum, s) => sum + s.wordCount, 0);

  if (plan.qaRequirements.minWordCount && totalWords < plan.qaRequirements.minWordCount) {
    issues.push({
      code: "WORD_COUNT_LOW",
      severity: "WARNING",
      message: `Total words ${totalWords} below minimum ${plan.qaRequirements.minWordCount}`,
    });
  }
  if (plan.qaRequirements.maxWordCount && totalWords > plan.qaRequirements.maxWordCount) {
    issues.push({
      code: "WORD_COUNT_HIGH",
      severity: "WARNING",
      message: `Total words ${totalWords} above maximum ${plan.qaRequirements.maxWordCount}`,
    });
  }

  const pk = plan.keywordPlan.primaryKeyword.toLowerCase();
  const intro = sections.find((s) => plan.sections.find((p) => p.id === s.sectionId)?.type === "INTRODUCTION");
  if (intro && pk && !intro.plainText.toLowerCase().includes(pk)) {
    issues.push({
      code: "PRIMARY_KEYWORD_INTRO",
      severity: "WARNING",
      message: "Primary keyword missing from introduction",
      sectionId: intro.sectionId,
    });
  }

  let keywordHits = 0;
  for (const section of sections) {
    const words = countWords(section.plainText);
    const hits = (section.plainText.match(new RegExp(pk, "gi")) ?? []).length;
    if (words > 0 && hits / words > 0.08) {
      issues.push({
        code: "KEYWORD_STUFFING",
        severity: "WARNING",
        message: "Possible keyword stuffing",
        sectionId: section.sectionId,
      });
    }
    keywordHits += hits;
  }

  if (plan.qaRequirements.requireCta && !plan.ctaPlan.primary.text) {
    issues.push({ code: "MISSING_CTA", severity: "ERROR", message: "CTA required for commercial content" });
  }

  const linkCount = sections.reduce((n, s) => n + s.internalLinkIdsUsed.length, 0);
  if (plan.qaRequirements.minInternalLinks && linkCount < plan.qaRequirements.minInternalLinks) {
    issues.push({
      code: "LOW_INTERNAL_LINKS",
      severity: "WARNING",
      message: `Internal link count ${linkCount} below minimum`,
    });
  }

  return issues;
}

export function runMetadataQa(plan: WritingPlan): WritingQaIssue[] {
  const issues: WritingQaIssue[] = [];
  if (plan.metadataPlan.metaTitle.length < 10) {
    issues.push({ code: "META_TITLE_SHORT", severity: "WARNING", message: "Meta title too short" });
  }
  if (plan.metadataPlan.metaTitle.length > 60) {
    issues.push({ code: "META_TITLE_LONG", severity: "WARNING", message: "Meta title too long" });
  }
  if (plan.metadataPlan.metaDescription.length < 50) {
    issues.push({ code: "META_DESC_SHORT", severity: "WARNING", message: "Meta description too short" });
  }
  return issues;
}
