import type { ContentContextPackage } from "@/features/content-context/content-context.types";
import { resolveImageCountPolicy } from "@/features/content/inline-media/image-count-policy";
import { deriveSectionMediaIntent } from "@/features/content/inline-media/section-media-intent";
import type { WritingProfile } from "@/features/writing-engine/writing-profiles";
import type {
  WritingInlineMediaHints,
  WritingMediaPlan,
  WritingMediaPlacement,
  WritingSectionPlan,
} from "@/features/writing-engine/writing-engine.types";
import { stableId } from "@/features/writing-engine/writing-utils";

const SLOT_PLACEMENT: Record<string, WritingMediaPlacement["placement"]> = {
  HERO: "COVER",
  FEATURED: "FEATURED",
  OG: "OG_IMAGE",
  COVER: "COVER",
  INLINE: "INLINE_AFTER",
  PROCESS: "INLINE_AFTER",
  MATERIAL: "INLINE_AFTER",
  FACTORY: "INLINE_AFTER",
  PRODUCT: "INLINE_AFTER",
  GALLERY: "GALLERY",
  BACKGROUND: "BACKGROUND",
};

function buildInlineHints(sections: WritingSectionPlan[]): WritingInlineMediaHints {
  const estimatedWords = sections.reduce(
    (sum, section) => sum + Math.round((section.targetWordCountMin + section.targetWordCountMax) / 2),
    0,
  );
  const policy = resolveImageCountPolicy(estimatedWords);
  const requiredIntents: string[] = [];
  const preferredSectionPlacement: string[] = [];
  const excludedSectionTypes: string[] = ["FAQ", "CTA", "CONCLUSION"];

  for (const section of sections) {
    const derived = deriveSectionMediaIntent({ heading: section.heading, sectionGoal: section.type });
    if (derived.excluded) {
      if (!excludedSectionTypes.includes(section.type)) excludedSectionTypes.push(section.type);
      continue;
    }
    if (!requiredIntents.includes(derived.intent)) requiredIntents.push(derived.intent);
    if (
      ["INTRODUCTION", "MATERIAL", "PROCESS", "MANUFACTURING", "PRODUCT", "SIZING"].includes(
        section.type,
      ) ||
      ["MATERIAL_DETAIL", "PRINT_METHOD", "PROCESS", "PRODUCT_OVERVIEW", "HERO_SUPPORT"].includes(
        derived.intent,
      )
    ) {
      preferredSectionPlacement.push(section.heading);
    }
  }

  return {
    requiredIntents,
    recommendedImageCount: policy.recommended,
    preferredSectionPlacement: preferredSectionPlacement.slice(0, 8),
    excludedSectionTypes,
    approvedMediaSources: ["BUNDLE", "ASSIGNMENT", "DISCOVERY"],
  };
}

export function planMedia(
  pkg: ContentContextPackage,
  sections: WritingSectionPlan[],
  profile: WritingProfile
): WritingMediaPlan {
  const warnings: string[] = [];
  const placements: WritingMediaPlacement[] = [];
  const usedAssetIds = new Set<string>();

  const assets = [...pkg.media.selectedAssets].sort((a, b) => a.sortOrder - b.sortOrder);

  for (const asset of assets) {
    if (!asset.url || asset.url.includes("/admin")) {
      warnings.push(`Private or invalid media skipped: ${asset.id}`);
      continue;
    }
    if (usedAssetIds.has(asset.id) && !asset.required) {
      warnings.push(`Duplicate media reuse limited: ${asset.id}`);
      continue;
    }

    const placement = SLOT_PLACEMENT[asset.slotType?.toUpperCase() ?? ""] ?? "INLINE_AFTER";
    const section = pickSectionForMedia(asset.slotType, sections);

    placements.push({
      id: stableId("media", `${asset.id}-${placement}`),
      mediaAssetId: asset.id,
      sectionId: section?.id ?? null,
      placement,
      required: asset.required,
      sortOrder: asset.sortOrder,
      altText: asset.altText ?? asset.title ?? "ATTD media",
      caption: asset.caption ?? null,
      sourceSlotType: asset.slotType,
      warnings: asset.warnings ?? [],
    });
    usedAssetIds.add(asset.id);
  }

  const hasFeatured = placements.some((p) => p.placement === "FEATURED" || p.placement === "COVER");
  if (profile.qaThresholds.requireFeaturedMedia && !hasFeatured) {
    warnings.push("Missing required hero/featured media");
  }

  for (const slot of pkg.media.slots) {
    if (slot.required && slot.status === "MISSING") {
      warnings.push(`Missing required bundle slot: ${slot.slotType}`);
    }
  }

  const inlineHints = buildInlineHints(sections);
  warnings.push(
    `Inline media: khuyến nghị ${inlineHints.recommendedImageCount} ảnh nội dung (Bundle trước, discovery sau). Không chèn URL vào prompt.`,
  );

  return { placements, warnings, inlineHints };
}

function pickSectionForMedia(
  slotType: string,
  sections: WritingSectionPlan[]
): WritingSectionPlan | undefined {
  const type = slotType?.toUpperCase() ?? "";
  if (/PROCESS/.test(type)) return sections.find((s) => s.type === "PROCESS") ?? sections[0];
  if (/MATERIAL|FABRIC/.test(type)) return sections.find((s) => s.type === "MATERIAL") ?? sections[0];
  if (/FACTORY|MANUFACT/.test(type))
    return sections.find((s) => s.type === "MANUFACTURING") ?? sections[0];
  if (/PRODUCT/.test(type)) return sections.find((s) => s.type === "PRODUCT") ?? sections[0];
  if (/HERO|COVER|FEATURED/.test(type)) return sections.find((s) => s.type === "INTRODUCTION");
  return sections.find((s) => s.type === "INFORMATIONAL") ?? sections[1];
}
