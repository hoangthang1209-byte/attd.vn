import type { MediaContentSuitability, MediaOrientation } from "@prisma/client";

export type BlogMediaDiscoveryPreset = {
  contentSuitabilities: MediaContentSuitability[];
  roles: string[];
  orientation?: MediaOrientation;
  visibility: "PUBLIC";
  minimumSeoScore?: number;
};

export const BLOG_FEATURED_PRESET: BlogMediaDiscoveryPreset = {
  contentSuitabilities: ["FEATURED_IMAGE", "BLOG_COVER"],
  roles: ["FEATURED", "HERO", "PRODUCT_MAIN"],
  orientation: "LANDSCAPE",
  visibility: "PUBLIC",
  minimumSeoScore: 65,
};

export const BLOG_OG_PRESET: BlogMediaDiscoveryPreset = {
  contentSuitabilities: ["OG_IMAGE", "FEATURED_IMAGE", "LANDING_HERO"],
  roles: ["FEATURED", "HERO", "OG"],
  orientation: "LANDSCAPE",
  visibility: "PUBLIC",
  minimumSeoScore: 65,
};

export const BLOG_INLINE_PRESET: BlogMediaDiscoveryPreset = {
  contentSuitabilities: [
    "BLOG_INLINE",
    "PROCESS_STEP",
    "MATERIAL_DETAIL",
    "TECHNIQUE_DETAIL",
    "FACTORY_STORY",
    "PRODUCT_DETAIL",
  ],
  roles: ["PROCESS", "MATERIAL", "TECHNIQUE", "FACTORY", "PRODUCT_DETAIL", "INLINE"],
  visibility: "PUBLIC",
};

export function blogDiscoveryPresetForPlacement(
  placement: "FEATURED" | "OG_IMAGE" | "INLINE" | "COVER",
): BlogMediaDiscoveryPreset {
  if (placement === "FEATURED" || placement === "COVER") return BLOG_FEATURED_PRESET;
  if (placement === "OG_IMAGE") return BLOG_OG_PRESET;
  return BLOG_INLINE_PRESET;
}
