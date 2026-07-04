import { isValidImageSrc } from "@/lib/imagePaths";
import { MANUFACTURING_MEDIA_ROLE_PRIORITY } from "@/lib/manufacturing/manufacturing.constants";
import type { ManufacturingFrontendAsset } from "@/lib/manufacturing/manufacturing.types";
import type { ManufacturingEvidenceCategory } from "@/lib/manufacturing-library.types";

type ManufacturingMediaLike = {
  role: string;
  altText: string | null;
  sortOrder: number;
  mediaAsset: {
    url: string;
    mimeType: string;
    altText: string | null;
    title: string | null;
  };
};

export type ManufacturingAssetWithFrontendRelations = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  visibility: "PUBLIC" | "DEALER_ONLY" | "CUSTOMER_ONLY" | "INTERNAL";
  priority: number;
  featured: boolean;
  publishedAt: Date | null;
  updatedAt?: Date | null;
  category: { slug: string; name: string } | null;
  media: ManufacturingMediaLike[];
  tags: Array<{ tag: { name: string; slug: string } }>;
};

const FALLBACK_CATEGORY: ManufacturingEvidenceCategory = "production";

function roleRank(role: string): number {
  const index = MANUFACTURING_MEDIA_ROLE_PRIORITY.findIndex((item) => item === role);
  return index >= 0 ? index : MANUFACTURING_MEDIA_ROLE_PRIORITY.length;
}

function orderedMedia(media: readonly ManufacturingMediaLike[]): ManufacturingMediaLike[] {
  return [...media].sort((a, b) => {
    const rankDiff = roleRank(a.role) - roleRank(b.role);
    if (rankDiff !== 0) return rankDiff;
    return a.sortOrder - b.sortOrder;
  });
}

function isVideoMedia(media: ManufacturingMediaLike): boolean {
  return media.role === "VIDEO" || media.mediaAsset.mimeType.toLowerCase().startsWith("video/");
}

function isImageMedia(media: ManufacturingMediaLike): boolean {
  return media.mediaAsset.mimeType.toLowerCase().startsWith("image/");
}

const VIDEO_EXTENSION_PATTERN = /\.(mp4|webm|ogg|mov)(\?.*)?$/i;

function isValidVideoSrc(src?: string | null): boolean {
  if (!src?.trim()) return false;
  const trimmed = src.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      new URL(trimmed);
      return true;
    } catch {
      return false;
    }
  }
  if (trimmed.startsWith("/") && trimmed.length > 1) return true;
  return VIDEO_EXTENSION_PATTERN.test(trimmed);
}

export function mapManufacturingAssetToFrontend(
  asset: ManufacturingAssetWithFrontendRelations,
): ManufacturingFrontendAsset {
  const sortedMedia = orderedMedia(asset.media);
  const imageMedia = sortedMedia.find(
    (media) =>
      !isVideoMedia(media) &&
      (isImageMedia(media) || isValidImageSrc(media.mediaAsset.url)) &&
      isValidImageSrc(media.mediaAsset.url),
  );
  const videoMedia = sortedMedia.find(
    (media) => isVideoMedia(media) && isValidVideoSrc(media.mediaAsset.url),
  );
  const imageUrl = imageMedia?.mediaAsset.url;
  const videoUrl = videoMedia?.mediaAsset.url;

  return {
    id: asset.id,
    title: asset.title,
    slug: asset.slug,
    href: `/manufacturing/${asset.slug}`,
    description: asset.description ?? "",
    category: (asset.category?.slug as ManufacturingEvidenceCategory | undefined) ?? FALLBACK_CATEGORY,
    categoryName: asset.category?.name,
    imageUrl,
    videoUrl,
    alt: imageMedia?.altText ?? imageMedia?.mediaAsset.altText ?? asset.title,
    tags: asset.tags.map(({ tag }) => tag.slug || tag.name),
    applicableSurfaces: [],
    priority: asset.priority,
    featured: asset.featured,
    visibility: asset.visibility,
    status: asset.status,
    publishedAt: asset.publishedAt?.toISOString(),
  };
}

export function manufacturingFrontendAssetHasMedia(asset: ManufacturingFrontendAsset): boolean {
  return Boolean(asset.imageUrl?.trim() || asset.videoUrl?.trim());
}
