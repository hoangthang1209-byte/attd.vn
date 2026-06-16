/**
 * Safe demo image replacement helpers — Patch 24.9.4b
 */

const PLACEHOLDER_HOSTS = [
  "picsum.photos",
  "placeholder.com",
  "dummyimage.com",
  "placehold.co",
  "via.placeholder.com",
  "placekitten.com",
];

/** Known demo CDN — safe to replace when entity is demo-marked. */
const DEMO_CDN_HOSTS = ["images.unsplash.com"];

export function isDemoOrPlaceholderImage(url?: string | null): boolean {
  if (!url || url.trim() === "") return true;
  const lower = url.toLowerCase();
  if (PLACEHOLDER_HOSTS.some((h) => lower.includes(h))) return true;
  if (DEMO_CDN_HOSTS.some((h) => lower.includes(h))) return true;
  return false;
}

export function isLikelyRealImage(url?: string | null): boolean {
  if (!url || url.trim() === "") return false;
  if (isDemoOrPlaceholderImage(url)) return false;
  if (url.includes("cloudinary.com") || url.includes("res.cloudinary.com")) return true;
  if (url.includes("blob.vercel-storage.com")) return true;
  return !isDemoOrPlaceholderImage(url);
}

export function isDemoMarkedMetadata(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== "object") return false;
  return (metadata as { isDemo?: boolean }).isDemo === true;
}

export function isDemoMarkedAiMetadata(aiMetadata: unknown): boolean {
  if (!aiMetadata || typeof aiMetadata !== "object") return false;
  return (aiMetadata as { isDemo?: boolean }).isDemo === true;
}

export function isDemoMarkedStructuredData(structuredData: unknown): boolean {
  if (!structuredData || typeof structuredData !== "object") return false;
  return (structuredData as { _demo?: boolean })._demo === true;
}

/**
 * Whether an image field may be updated with demo imagery.
 */
export function shouldReplaceImage(
  entityIsDemo: boolean,
  imageUrl?: string | null,
): boolean {
  if (!imageUrl || imageUrl.trim() === "") return true;
  if (entityIsDemo) return isDemoOrPlaceholderImage(imageUrl);
  return isDemoOrPlaceholderImage(imageUrl);
}

export function filterGalleryForReplace(
  gallery: string[] | null | undefined,
  entityIsDemo: boolean,
): { replaceAll: boolean; keep: string[] } {
  const items = Array.isArray(gallery) ? gallery : [];
  if (items.length === 0) return { replaceAll: true, keep: [] };
  const keep = items.filter((url) => !shouldReplaceImage(entityIsDemo, url));
  if (keep.length === 0) return { replaceAll: true, keep: [] };
  if (entityIsDemo && keep.length < items.length) {
    return { replaceAll: false, keep };
  }
  if (!entityIsDemo) return { replaceAll: false, keep: items };
  return { replaceAll: true, keep: [] };
}
