import type { ContentContextPackage } from "@/features/content-context/content-context.types";
import type { WritingProfile } from "@/features/writing-engine/writing-profiles";
import type {
  WritingInternalLinkPlan,
  WritingInternalLinkPlacement,
  WritingSectionPlan,
} from "@/features/writing-engine/writing-engine.types";
import { stableId } from "@/features/writing-engine/writing-utils";

export function planInternalLinks(
  pkg: ContentContextPackage,
  sections: WritingSectionPlan[],
  profile: WritingProfile,
  topicId: string
): WritingInternalLinkPlan {
  const placements: WritingInternalLinkPlacement[] = [];
  const usedTargets = new Set<string>();
  const maxLinks = profile.linkRequirements.max;

  const candidates = [...pkg.internalLinks]
    .filter((l) => l.url && !l.url.includes("/admin"))
    .sort((a, b) => {
      const aAccepted = a.status === "ACCEPTED" ? 1 : 0;
      const bAccepted = b.status === "ACCEPTED" ? 1 : 0;
      if (bAccepted !== aAccepted) return bAccepted - aAccepted;
      return b.relevanceScore - a.relevanceScore;
    });

  const eligibleSections = sections.filter(
    (s) => s.type !== "INTRODUCTION" && s.type !== "CTA" && s.type !== "FAQ"
  );

  let sectionIdx = 0;
  for (const link of candidates) {
    if (placements.length >= maxLinks) break;
    const targetKey = link.targetId ?? link.url;
    if (link.targetId === topicId || link.url.includes(`/topics/${topicId}`)) continue;
    if (usedTargets.has(targetKey)) continue;

    const section = eligibleSections[sectionIdx % Math.max(eligibleSections.length, 1)];
    sectionIdx += 1;
    if (!section) continue;

    placements.push({
      id: stableId("link", targetKey),
      targetId: targetKey,
      targetTitle: link.targetTitle,
      url: link.url,
      anchorText: link.anchorText || link.targetTitle,
      sectionId: section.id,
      required: link.required || link.recommendation === "REQUIRED",
      relevanceScore: link.relevanceScore,
      placementReason: link.reason ?? link.recommendation,
    });
    usedTargets.add(targetKey);
    section.internalLinkIds.push(stableId("link", targetKey));
  }

  return { placements, maxLinks };
}
