import type { ContentContextPackage } from "@/features/content-context/content-context.types";
import { getWritingProfile } from "@/features/writing-engine/writing-profiles";
import { allocateFactsToSections } from "@/features/writing-engine/services/writing-fact-allocator.service";
import {
  buildCitationPlan,
  citationsForSection,
} from "@/features/writing-engine/services/writing-citation-planner.service";
import { planMedia } from "@/features/writing-engine/services/writing-media-planner.service";
import { planInternalLinks } from "@/features/writing-engine/services/writing-internal-link-planner.service";
import { planCta } from "@/features/writing-engine/services/writing-cta-planner.service";
import {
  planKeywords,
  planTitleAndMetadata,
} from "@/features/writing-engine/services/writing-keyword-planner.service";
import { planSchema } from "@/features/writing-engine/services/writing-schema-planner.service";
import { compileWritingOutline } from "@/features/writing-engine/services/writing-outline-compiler.service";
import { allocateWordCounts } from "@/features/writing-engine/services/writing-word-count.service";
import { evaluateWritingPlanReadiness } from "@/features/writing-engine/services/writing-plan-readiness.service";
import {
  WRITING_ENGINE_VERSION,
  WRITING_PROFILE_VERSION,
  type BuildWritingPlanRequest,
  type WritingPlan,
  type WritingPlanStatus,
} from "@/features/writing-engine/writing-engine.types";
import { hashObject, stableId } from "@/features/writing-engine/writing-utils";

export function hashWritingPlanInput(input: {
  packageHash: string;
  briefVersion: number | null;
  contentType: string;
}): string {
  return hashObject({
    packageHash: input.packageHash,
    briefVersion: input.briefVersion,
    profileVersion: WRITING_PROFILE_VERSION,
    engineVersion: WRITING_ENGINE_VERSION,
    contentType: input.contentType,
  });
}

export function buildWritingPlanFromPackage(
  pkg: ContentContextPackage,
  request: BuildWritingPlanRequest,
  planId?: string
): WritingPlan {
  const profile = getWritingProfile(request.contentType);
  const outline = compileWritingOutline(pkg, profile);
  const wordAlloc = allocateWordCounts(outline.sections, pkg, profile);
  const factAlloc = allocateFactsToSections(pkg, wordAlloc.sections);
  const citationPlan = buildCitationPlan(pkg);

  const sectionsWithCitations = factAlloc.sections.map((section) => ({
    ...section,
    citationIds: citationsForSection(
      citationPlan,
      [...section.requiredFactIds, ...section.optionalFactIds]
    ).map((c) => c.id),
  }));

  const mediaPlan = planMedia(pkg, sectionsWithCitations, profile);
  for (const placement of mediaPlan.placements) {
    if (!placement.sectionId) continue;
    const section = sectionsWithCitations.find((s) => s.id === placement.sectionId);
    if (section && !section.mediaAssetIds.includes(placement.mediaAssetId)) {
      section.mediaAssetIds.push(placement.mediaAssetId);
      if (placement.sourceSlotType) section.mediaSlotTypes.push(placement.sourceSlotType);
    }
  }

  const internalLinkPlan = planInternalLinks(
    pkg,
    sectionsWithCitations,
    profile,
    request.topicId
  );
  const ctaPlan = planCta(pkg, sectionsWithCitations, profile);
  const keywordPlan = planKeywords(pkg, sectionsWithCitations);
  const { titlePlan, metadataPlan } = planTitleAndMetadata(pkg);
  const schemaPlan = planSchema(pkg, profile);

  const readiness = evaluateWritingPlanReadiness({
    pkg,
    profile,
    sections: sectionsWithCitations,
    factPlan: factAlloc.factPlan,
    mediaPlan,
    internalLinkPlan,
    ctaPlan,
    compileErrors: outline.errors,
    compileWarnings: outline.warnings,
  });

  const planBody = {
    version: WRITING_ENGINE_VERSION,
    contentType: request.contentType,
    contextBuildId: request.contextBuildId,
    topicId: request.topicId,
    briefId: pkg.entity.briefId ?? null,
    language: request.language ?? pkg.language ?? "vi",
    titlePlan,
    metadataPlan,
    sections: sectionsWithCitations,
    factPlan: factAlloc.factPlan,
    citationPlan,
    mediaPlan,
    internalLinkPlan,
    ctaPlan,
    keywordPlan,
    schemaPlan,
    outputRules: profile.outputRules,
    qaRequirements: profile.qaThresholds,
    readiness,
    sourceManifest: pkg.sourceManifest.map((s) => ({
      factId: s.factId,
      sourceType: s.sourceType,
      sourceId: s.sourceId,
      title: s.title,
    })),
    warnings: readiness.warnings,
  };

  const planHash = hashObject(planBody);

  return {
    id: planId ?? stableId("wplan", planHash),
    ...planBody,
    planHash,
    generatedAt: new Date().toISOString(),
  };
}

export function derivePlanStatus(plan: WritingPlan): WritingPlanStatus {
  if (!plan.readiness.ready) return "INVALID";
  return "READY";
}

export type WritingPlanDiffSummary = {
  sectionsAdded: string[];
  sectionsRemoved: string[];
  factAllocationChanges: number;
  mediaChanges: number;
  linkChanges: number;
  ctaChanged: boolean;
};

export function diffWritingPlans(prev: WritingPlan | null, next: WritingPlan): WritingPlanDiffSummary {
  if (!prev) {
    return {
      sectionsAdded: next.sections.map((s) => s.heading),
      sectionsRemoved: [],
      factAllocationChanges: next.factPlan.usages.length,
      mediaChanges: next.mediaPlan.placements.length,
      linkChanges: next.internalLinkPlan.placements.length,
      ctaChanged: true,
    };
  }

  const prevKeys = new Set(prev.sections.map((s) => s.sectionKey));
  const nextKeys = new Set(next.sections.map((s) => s.sectionKey));

  return {
    sectionsAdded: next.sections.filter((s) => !prevKeys.has(s.sectionKey)).map((s) => s.heading),
    sectionsRemoved: prev.sections.filter((s) => !nextKeys.has(s.sectionKey)).map((s) => s.heading),
    factAllocationChanges: Math.abs(next.factPlan.usages.length - prev.factPlan.usages.length),
    mediaChanges: Math.abs(next.mediaPlan.placements.length - prev.mediaPlan.placements.length),
    linkChanges: Math.abs(
      next.internalLinkPlan.placements.length - prev.internalLinkPlan.placements.length
    ),
    ctaChanged: prev.ctaPlan.primary.text !== next.ctaPlan.primary.text,
  };
}
