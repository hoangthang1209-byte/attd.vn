import type {
  WritingPlan,
  WritingSectionDraft,
  WritingSectionRequest,
} from "@/features/writing-engine/writing-engine.types";
import { countWords, stableId } from "@/features/writing-engine/writing-utils";

export function isWritingMockEnabled(): boolean {
  return process.env.WRITING_ENGINE_MOCK_ENABLED === "true";
}

export function buildSectionRequest(plan: WritingPlan, sectionId: string): WritingSectionRequest | null {
  const section = plan.sections.find((s) => s.id === sectionId);
  if (!section) return null;

  const factIds = [...section.requiredFactIds, ...section.optionalFactIds];
  const facts = factIds.map((factId) => {
    const usage = plan.factPlan.usages.find((u) => u.factId === factId);
    return {
      factId,
      statement: usage?.statement ?? `[fact:${factId}]`,
      structuredValue: usage?.structuredValue ?? null,
      mustUseExactValue: usage?.mustUseExactValue ?? false,
    };
  });

  const sectionIndex = plan.sections.findIndex((s) => s.id === sectionId);
  const previous = sectionIndex > 0 ? plan.sections[sectionIndex - 1] : null;
  const next = sectionIndex >= 0 ? plan.sections[sectionIndex + 1] : null;

  return {
    planId: plan.id,
    sectionId: section.id,
    contentType: plan.contentType,
    language: plan.language,
    heading: section.heading,
    purpose: section.purpose,
    targetWordCountMin: section.targetWordCountMin,
    targetWordCountMax: section.targetWordCountMax,
    facts,
    businessRules: section.businessRuleIds.map((ruleId) => ({
      ruleId,
      title: ruleId,
      outcome: {},
    })),
    citations: plan.citationPlan.citations.filter((c) => section.citationIds.includes(c.id)),
    mediaPlacements: plan.mediaPlan.placements.filter((m) => m.sectionId === section.id),
    internalLinks: plan.internalLinkPlan.placements.filter((l) => l.sectionId === section.id),
    keywords: {
      required: section.requiredKeywords,
      optional: section.optionalKeywords,
    },
    brandRules: [],
    outputRules: [
      ...Object.entries(plan.outputRules)
        .filter(([, v]) => v)
        .map(([k]) => k),
    ],
    prohibitedClaims: section.prohibitedClaims,
    previousSectionSummary: previous ? previous.purpose : null,
    nextSectionPurpose: next?.purpose ?? null,
  };
}

export function generateMockSectionDraft(
  plan: WritingPlan,
  sectionId: string
): WritingSectionDraft {
  if (!isWritingMockEnabled()) {
    throw new Error("Mock generation disabled");
  }

  const request = buildSectionRequest(plan, sectionId);
  const section = plan.sections.find((s) => s.id === sectionId);
  if (!request || !section) throw new Error("Section not found");

  const factIdsUsed = section.requiredFactIds.slice(0, 2);
  const linkIds = plan.internalLinkPlan.placements
    .filter((l) => l.sectionId === sectionId)
    .slice(0, 1)
    .map((l) => l.id);
  const mediaIds = plan.mediaPlan.placements
    .filter((m) => m.sectionId === sectionId)
    .slice(0, 1)
    .map((m) => m.id);

  const linkHtml =
    linkIds.length > 0
      ? `<p><a href="${plan.internalLinkPlan.placements.find((l) => l.id === linkIds[0])?.url}">${plan.internalLinkPlan.placements.find((l) => l.id === linkIds[0])?.anchorText}</a></p>`
      : "";

  const plain = `[MOCK] ${section.heading}. ${section.purpose}. Facts: ${factIdsUsed.join(", ") || "none"}.`;
  const html = `<p><strong>[MOCK — NOT PRODUCTION]</strong> ${plain}</p>${linkHtml}`;

  return {
    sectionId,
    heading: section.heading,
    html,
    plainText: plain,
    factIdsUsed,
    citationIdsUsed: plan.citationPlan.citations
      .filter((c) => factIdsUsed.includes(c.factId))
      .map((c) => c.id),
    internalLinkIdsUsed: linkIds,
    mediaPlacementIdsUsed: mediaIds,
    keywordUsage: section.requiredKeywords,
    claims: factIdsUsed.map((factId) => ({ text: `[MOCK claim for ${factId}]`, factId })),
    wordCount: countWords(plain),
    warnings: ["MOCK OUTPUT"],
    isMock: true,
  };
}

export function generateMockDraftSections(plan: WritingPlan): WritingSectionDraft[] {
  return plan.sections.map((s) => generateMockSectionDraft(plan, s.id));
}

export function emptySectionDraft(sectionId: string, heading: string): WritingSectionDraft {
  return {
    sectionId,
    heading,
    html: "",
    plainText: "",
    factIdsUsed: [],
    citationIdsUsed: [],
    internalLinkIdsUsed: [],
    mediaPlacementIdsUsed: [],
    keywordUsage: [],
    claims: [],
    wordCount: 0,
    warnings: [],
  };
}

export function stableDraftId(planId: string): string {
  return stableId("wdraft", planId);
}
