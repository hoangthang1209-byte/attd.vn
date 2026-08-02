import type { InlineMediaPlan } from "@/features/content/inline-media/inline-media.types";

/** Serialize a plan for the API/UI without circular refs. */
export function serializeInlineMediaPlan(plan: InlineMediaPlan) {
  return {
    targetCount: plan.targetCount,
    proposedCount: plan.proposedCount,
    placements: plan.placements.map((placement) => ({
      block: placement.block,
      section: {
        id: placement.section.id,
        heading: placement.section.heading,
        intent: placement.section.intent,
      },
      candidate: {
        mediaAssetId: placement.candidate.mediaAssetId,
        url: placement.candidate.url,
        thumbnailUrl: placement.candidate.thumbnailUrl,
        title: placement.candidate.title,
        altText: placement.candidate.altText,
        caption: placement.candidate.caption,
        width: placement.candidate.width,
        height: placement.candidate.height,
        source: placement.candidate.source,
        bundleSlotType: placement.candidate.bundleSlotType,
        visibility: placement.candidate.visibility,
      },
      score: placement.score,
    })),
    skippedSections: plan.skippedSections,
    gaps: plan.gaps,
    warnings: plan.warnings,
    durationMs: plan.durationMs,
    diagnostics: plan.diagnostics,
  };
}
