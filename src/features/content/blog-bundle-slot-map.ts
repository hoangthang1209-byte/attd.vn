import type { ContentMediaPlacement, MediaBundleSlotType } from "@prisma/client";

/** Default BLOG_ARTICLE slot → content placement mapping (Sprint 10.5). */
const BLOG_ARTICLE_SLOT_MAP: Partial<Record<MediaBundleSlotType, ContentMediaPlacement>> = {
  FEATURED: "FEATURED",
  COVER: "COVER",
  OG_IMAGE: "OG_IMAGE",
  INLINE: "INLINE",
  PROCESS: "INLINE",
  MATERIAL: "INLINE",
  TECHNIQUE: "INLINE",
  FACTORY: "INLINE",
  PRODUCT: "INLINE",
  GALLERY: "INLINE",
  HERO: "FEATURED",
  BACKGROUND: "BACKGROUND",
};

export function mapBundleSlotToBlogPlacement(
  slotType: MediaBundleSlotType,
): ContentMediaPlacement | null {
  return BLOG_ARTICLE_SLOT_MAP[slotType] ?? null;
}

export function isSingleAssetPlacement(placement: ContentMediaPlacement): boolean {
  return placement === "FEATURED" || placement === "OG_IMAGE" || placement === "COVER";
}

export function placementToLegacyBlogField(
  placement: ContentMediaPlacement,
): "featuredImageUrl" | "ogImageUrl" | null {
  if (placement === "FEATURED") return "featuredImageUrl";
  if (placement === "OG_IMAGE") return "ogImageUrl";
  return null;
}

/**
 * Safe legacy URL sync: clear only when the stored URL still equals the removed asset URL.
 */
export function shouldClearLegacyUrl(params: {
  currentUrl: string | null | undefined;
  removedAssetUrl: string | null | undefined;
}): boolean {
  const current = params.currentUrl?.trim() || "";
  const removed = params.removedAssetUrl?.trim() || "";
  if (!current || !removed) return false;
  return current === removed;
}
