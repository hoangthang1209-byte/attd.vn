import type {
  WritingPlan,
  WritingQaIssue,
  WritingSectionDraft,
} from "@/features/writing-engine/writing-engine.types";
import { runClaimQa } from "@/features/writing-engine/qa/claim-qa";
import { countWords } from "@/features/writing-engine/writing-utils";

export function runSectionLevelQa(
  plan: WritingPlan,
  draft: WritingSectionDraft
): WritingQaIssue[] {
  const issues: WritingQaIssue[] = [];
  const section = plan.sections.find((s) => s.id === draft.sectionId);
  if (!section) {
    return [
      {
        code: "UNKNOWN_SECTION",
        severity: "BLOCKING",
        message: "Unknown section",
        sectionId: draft.sectionId,
      },
    ];
  }

  if (draft.heading !== section.heading) {
    issues.push({
      code: "HEADING_MISMATCH",
      severity: "ERROR",
      message: "Heading does not match plan",
      sectionId: draft.sectionId,
    });
  }

  for (const factId of section.requiredFactIds) {
    if (!draft.factIdsUsed.includes(factId)) {
      issues.push({
        code: "MISSING_REQUIRED_FACT",
        severity: "ERROR",
        message: `Required fact not used: ${factId}`,
        sectionId: draft.sectionId,
        factId,
      });
    }
  }

  const words = countWords(draft.plainText);
  if (words < section.targetWordCountMin * 0.5) {
    issues.push({
      code: "WORD_COUNT_LOW",
      severity: "WARNING",
      message: `Word count ${words} below section budget`,
      sectionId: draft.sectionId,
    });
  }
  if (words > section.targetWordCountMax * 1.5) {
    issues.push({
      code: "WORD_COUNT_HIGH",
      severity: "WARNING",
      message: `Word count ${words} above section budget`,
      sectionId: draft.sectionId,
    });
  }

  for (const keyword of section.requiredKeywords) {
    if (!draft.plainText.toLowerCase().includes(keyword.toLowerCase())) {
      issues.push({
        code: "KEYWORD_MISSING",
        severity: "WARNING",
        message: `Required keyword missing: ${keyword}`,
        sectionId: draft.sectionId,
      });
    }
  }

  if (section.type === "CTA" && draft.plainText.length > 400) {
    issues.push({
      code: "CTA_TOO_LONG",
      severity: "WARNING",
      message: "CTA section should stay concise",
      sectionId: draft.sectionId,
    });
  }

  issues.push(...runClaimQa([draft]));
  return issues;
}
