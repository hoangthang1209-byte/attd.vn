/**
 * Product media foundation adapters (Sprint 14.7).
 * Product featured/gallery/variant remain URL fields — resolve via canonical resolver.
 * No Product schema FK migration in this sprint.
 */

import {
  resolveLegacyMediaUrl,
  resolveMedia,
  type ResolvedMedia,
} from "@/features/media/resolve-media";

/** Featured image / gallery / variant URL → public src via resolver. */
export function resolveProductImageUrl(url: string | null | undefined): string | null {
  return resolveLegacyMediaUrl(url);
}

/** Description-block style dual-read (mediaId + snapshot URL). */
export function resolveProductDescriptionMedia(input: {
  mediaId?: string | null;
  mediaAsset?: {
    id?: string | null;
    url?: string | null;
    thumbnailUrl?: string | null;
    altText?: string | null;
    title?: string | null;
    visibility?: string | null;
    lifecycleStatus?: string | null;
  } | null;
  imageUrl?: string | null;
}): ResolvedMedia {
  return resolveMedia({
    mediaAsset: input.mediaAsset ?? (input.mediaId ? { id: input.mediaId } : null),
    mediaAssetId: input.mediaId ?? input.mediaAsset?.id ?? null,
    legacyUrl: input.imageUrl,
  });
}
