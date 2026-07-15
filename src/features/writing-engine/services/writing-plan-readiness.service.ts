import type { ContentContextPackage } from "@/features/content-context/content-context.types";
import type { WritingProfile } from "@/features/writing-engine/writing-profiles";
import type {
  WritingCtaPlan,
  WritingFactPlan,
  WritingInternalLinkPlan,
  WritingIssue,
  WritingMediaPlan,
  WritingPlanReadiness,
  WritingSectionPlan,
} from "@/features/writing-engine/writing-engine.types";

export function evaluateWritingPlanReadiness(input: {
  pkg: ContentContextPackage;
  profile: WritingProfile;
  sections: WritingSectionPlan[];
  factPlan: WritingFactPlan;
  mediaPlan: WritingMediaPlan;
  internalLinkPlan: WritingInternalLinkPlan;
  ctaPlan: WritingCtaPlan;
  compileErrors: WritingIssue[];
  compileWarnings: WritingIssue[];
}): WritingPlanReadiness {
  const errors: WritingIssue[] = [...input.compileErrors];
  const warnings: WritingIssue[] = [
    ...input.compileWarnings,
    ...input.mediaPlan.warnings.map((w) => ({
      code: "MEDIA_WARNING",
      severity: "WARNING" as const,
      message: w,
    })),
    ...input.ctaPlan.warnings.map((w) => ({
      code: "CTA_WARNING",
      severity: "WARNING" as const,
      message: w,
    })),
  ];

  if (!input.pkg.outputRules.publicOutputOnly) {
    errors.push({
      code: "NOT_PUBLIC_SAFE",
      severity: "BLOCKING",
      message: "Context package not public-output safe",
    });
  }

  if (input.factPlan.unallocatedFactIds.length > 0) {
    errors.push({
      code: "REQUIRED_FACT_UNALLOCATED",
      severity: "BLOCKING",
      message: `Required facts unallocated: ${input.factPlan.unallocatedFactIds.join(", ")}`,
    });
  }

  if (
    input.profile.qaThresholds.requireCta &&
    !input.ctaPlan.primary.text
  ) {
    errors.push({
      code: "MISSING_CTA",
      severity: "BLOCKING",
      message: "Required commercial CTA missing",
    });
  }

  if (input.internalLinkPlan.placements.length < input.profile.linkRequirements.min) {
    warnings.push({
      code: "LOW_INTERNAL_LINKS",
      severity: "WARNING",
      message: `Internal links below minimum (${input.internalLinkPlan.placements.length}/${input.profile.linkRequirements.min})`,
    });
  }

  for (const fact of input.pkg.facts.filter((f) => f.stale)) {
    warnings.push({
      code: "STALE_FACT",
      severity: "WARNING",
      message: `Stale fact in plan: ${fact.factId}`,
      factId: fact.factId,
    });
  }

  const commercialSections = input.sections.filter((s) =>
    ["COMMERCIAL", "PRICING", "PRODUCT"].includes(s.type)
  );
  for (const section of commercialSections) {
    if (section.required && section.requiredFactIds.length === 0 && section.optionalFactIds.length === 0) {
      warnings.push({
        code: "SECTION_UNDER_SUPPORTED",
        severity: "WARNING",
        message: `Section "${section.heading}" has no allocated facts`,
        sectionId: section.id,
      });
    }
  }

  const blocking = errors.filter((e) => e.severity === "BLOCKING" || e.severity === "ERROR");
  const scoreBase = 100;
  const penalty = blocking.length * 25 + warnings.length * 3;
  const score = Math.max(0, scoreBase - penalty);

  return {
    ready: blocking.length === 0,
    score,
    errors,
    warnings,
  };
}
