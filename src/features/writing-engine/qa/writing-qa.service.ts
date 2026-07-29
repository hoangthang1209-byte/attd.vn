import type {
  WritingPlan,
  WritingQaReport,
  WritingStructuredDraft,
} from "@/features/writing-engine/writing-engine.types";
import { runStructureQa } from "@/features/writing-engine/qa/structure-qa";
import { runFactQa } from "@/features/writing-engine/qa/fact-qa";
import { runClaimQa } from "@/features/writing-engine/qa/claim-qa";
import { runLinkQa } from "@/features/writing-engine/qa/link-qa";
import { runMediaQa } from "@/features/writing-engine/qa/media-qa";
import { runMetadataQa, runSeoQa } from "@/features/writing-engine/qa/seo-qa";
import { runSafetyQa, runSchemaQa } from "@/features/writing-engine/qa/schema-qa";
import {
  countVisibleFaqEntries,
  isMediaFactId,
} from "@/features/content/editorial/review-approval.policy";

export function runWritingQa(plan: WritingPlan, draft: WritingStructuredDraft): WritingQaReport {
  const sections = draft.sections;
  const issues = [
    ...runStructureQa(plan, sections),
    ...runFactQa(plan, sections),
    ...runClaimQa(sections),
    ...runLinkQa(plan, sections),
    ...runMediaQa(plan, sections),
    ...runSeoQa(plan, sections),
    ...runMetadataQa(plan),
    ...runSchemaQa(plan, {
      structuredFaqCount: draft.faq.length,
      visibleFaqCount: countVisibleFaqEntries(sections),
    }),
    ...runSafetyQa(plan),
  ];

  const blocking = issues.filter((i) => i.severity === "BLOCKING" || i.severity === "ERROR");
  const requiredFacts = plan.factPlan.usages.filter(
    (u) => u.required && !isMediaFactId(u.factId)
  ).length;
  const usedFacts = new Set(sections.flatMap((s) => s.factIdsUsed)).size;
  const requiredFactCoverage =
    requiredFacts === 0 ? 1 : Math.min(1, usedFacts / requiredFacts);

  const totalWords = sections.reduce((sum, s) => sum + s.wordCount, 0);
  const unsupportedClaimCount = issues.filter((i) =>
    ["SUPERLATIVE", "GUARANTEE", "MOQ", "LEAD_TIME", "CAPACITY"].includes(i.code)
  ).length;

  const score = Math.max(0, 100 - blocking.length * 20 - issues.length * 2);

  return {
    passed: blocking.length === 0,
    score,
    issues,
    metrics: {
      totalWords,
      sectionCount: sections.length,
      requiredFactCoverage,
      usedFactCount: usedFacts,
      unsupportedClaimCount,
      internalLinkCount: sections.reduce((n, s) => n + s.internalLinkIdsUsed.length, 0),
      mediaCount: sections.reduce((n, s) => n + s.mediaPlacementIdsUsed.length, 0),
      missingAltCount: issues.filter((i) => i.code === "MISSING_ALT").length,
      headingErrors: issues.filter((i) => i.code === "HEADING_HIERARCHY").length,
      keywordWarnings: issues.filter((i) => i.code === "KEYWORD_STUFFING").length,
    },
  };
}
