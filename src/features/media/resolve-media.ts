/**
 * Canonical media resolution for public/admin consumers (Sprint 14.7).
 * Order: MediaAsset → legacy URL → null (caller may use placeholder).
 * Never invents matches. Never mutates storage.
 */

import { getPublicMediaUrl } from "@/features/media/get-public-media-url";

export type ResolvableMediaAsset = {
  id?: string | null;
  url?: string | null;
  thumbnailUrl?: string | null;
  altText?: string | null;
  title?: string | null;
  visibility?: string | null;
  lifecycleStatus?: string | null;
};

export type ResolveMediaInput = {
  mediaAsset?: ResolvableMediaAsset | null;
  mediaAssetId?: string | null;
  /** Legacy URL mirror / snapshot */
  legacyUrl?: string | null;
  /** Prefer thumbnail when resolving card-sized images */
  preferThumbnail?: boolean;
};

export type ResolvedMedia = {
  src: string | null;
  alt: string | null;
  mediaAssetId: string | null;
  source: "MEDIA_ASSET" | "LEGACY_URL" | "NONE";
  broken: boolean;
};

/**
 * Resolve a public-safe image URL from MediaAsset and/or legacy URL.
 * Skips PRIVATE assets for public rendering unless explicitly allowed.
 */
export function resolveMedia(
  input: ResolveMediaInput,
  options?: { allowPrivate?: boolean },
): ResolvedMedia {
  const asset = input.mediaAsset ?? null;

  if (asset) {
    const lifecycle = asset.lifecycleStatus;
    const visibility = asset.visibility;
    const blockedLifecycle =
      lifecycle === "ARCHIVED" || lifecycle === "RETIRED";
    // Existing public pages must still render historically linked archived assets
    // when the FK is set — archived blocks new selection, not historical render.
    void blockedLifecycle;

    if (visibility === "PRIVATE" && !options?.allowPrivate) {
      // Fall through to legacy URL if present (compatibility)
    } else {
      const candidate = input.preferThumbnail
        ? asset.thumbnailUrl || asset.url
        : asset.url || asset.thumbnailUrl;
      const src = getPublicMediaUrl(candidate ?? null);
      if (src) {
        return {
          src,
          alt: asset.altText?.trim() || asset.title?.trim() || null,
          mediaAssetId: asset.id ?? input.mediaAssetId ?? null,
          source: "MEDIA_ASSET",
          broken: false,
        };
      }
    }
  }

  const legacy = getPublicMediaUrl(input.legacyUrl ?? null);
  if (legacy) {
    return {
      src: legacy,
      alt: asset?.altText?.trim() || asset?.title?.trim() || null,
      mediaAssetId: input.mediaAssetId ?? asset?.id ?? null,
      source: "LEGACY_URL",
      broken: false,
    };
  }

  // Non-public legacy paths that fail getPublicMediaUrl but pass isValidImageSrc
  // are handled by callers that still accept local paths — mark broken if neither works.
  const rawLegacy = input.legacyUrl?.trim() || null;
  if (rawLegacy) {
    return {
      src: rawLegacy,
      alt: null,
      mediaAssetId: input.mediaAssetId ?? null,
      source: "LEGACY_URL",
      broken: true,
    };
  }

  return {
    src: null,
    alt: null,
    mediaAssetId: input.mediaAssetId ?? null,
    source: "NONE",
    broken: false,
  };
}

/** Convenience for Product featured / gallery string fields (foundation only). */
export function resolveLegacyMediaUrl(url: string | null | undefined): string | null {
  return resolveMedia({ legacyUrl: url }).src;
}

/** Sync picker write: always store MediaAsset id + URL mirror. */
export type CanonicalMediaWrite = {
  mediaAssetId: string | null;
  imageUrl: string | null;
  altText?: string | null;
};

export function buildCanonicalMediaWrite(input: {
  mediaAssetId?: string | null;
  url?: string | null;
  altText?: string | null;
}): CanonicalMediaWrite {
  const url = getPublicMediaUrl(input.url ?? null) ?? input.url?.trim() ?? null;
  const id = input.mediaAssetId?.trim() || null;
  return {
    mediaAssetId: id,
    imageUrl: url,
    altText: input.altText?.trim() || null,
  };
}

/** Shared Prisma select for public dual-read consumers. */
export const MEDIA_ASSET_PUBLIC_SELECT = {
  id: true,
  url: true,
  thumbnailUrl: true,
  altText: true,
  title: true,
  visibility: true,
  lifecycleStatus: true,
} as const;

/** Resolve display URL for Category / Case Study style dual-read rows. */
export function resolveEntityMediaSrc(input: {
  mediaAsset?: ResolvableMediaAsset | null;
  mediaAssetId?: string | null;
  imageUrl?: string | null;
  preferThumbnail?: boolean;
}): string | null {
  return resolveMedia({
    mediaAsset: input.mediaAsset,
    mediaAssetId: input.mediaAssetId,
    legacyUrl: input.imageUrl,
    preferThumbnail: input.preferThumbnail,
  }).src;
}
