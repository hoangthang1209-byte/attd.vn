import type { WritingPlan, WritingQaIssue, WritingSectionDraft } from "@/features/writing-engine/writing-engine.types";

export function runMediaQa(plan: WritingPlan, sections: WritingSectionDraft[]): WritingQaIssue[] {
  const issues: WritingQaIssue[] = [];
  const usedCounts = new Map<string, number>();

  for (const section of sections) {
    for (const placementId of section.mediaPlacementIdsUsed) {
      const placement = plan.mediaPlan.placements.find((p) => p.id === placementId);
      if (!placement) {
        issues.push({
          code: "UNKNOWN_MEDIA",
          severity: "ERROR",
          message: `Unknown media placement: ${placementId}`,
          sectionId: section.sectionId,
        });
        continue;
      }
      if (!placement.altText.trim()) {
        issues.push({
          code: "MISSING_ALT",
          severity: "WARNING",
          message: "Missing alt text",
          mediaAssetId: placement.mediaAssetId,
          sectionId: section.sectionId,
        });
      }
      usedCounts.set(
        placement.mediaAssetId,
        (usedCounts.get(placement.mediaAssetId) ?? 0) + 1
      );
    }
  }

  for (const [assetId, count] of usedCounts) {
    if (count > 2) {
      issues.push({
        code: "REPEATED_MEDIA",
        severity: "WARNING",
        message: `Media asset reused excessively: ${assetId}`,
        mediaAssetId: assetId,
      });
    }
  }

  if (plan.qaRequirements.requireFeaturedMedia) {
    const featured = plan.mediaPlan.placements.some((p) => p.placement === "FEATURED" || p.placement === "COVER");
    if (!featured) {
      issues.push({ code: "MISSING_FEATURED", severity: "WARNING", message: "Featured media missing" });
    }
  }

  return issues;
}
