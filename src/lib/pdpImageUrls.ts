import { isValidImageSrc } from "@/lib/imagePaths";

/** Rendered main-stage width hint for Next/Image `sizes`. */
export const PDP_MAIN_IMAGE_SIZES =
  "(max-width: 899px) 100vw, (min-width: 1200px) 800px, 60vw";

export const PDP_MAIN_IMAGE_QUALITY = 93;

export const PDP_ZOOM_IMAGE_SIZES = "min(100vw, 2400px)";

export const PDP_ZOOM_IMAGE_QUALITY = 95;

const CLOUDINARY_UPLOAD_MARKER = "/image/upload/";

export function isCloudinaryImageUrl(url: string): boolean {
  try {
    return new URL(url).hostname.includes("res.cloudinary.com");
  } catch {
    return false;
  }
}

export function isVercelBlobImageUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host.includes("blob.vercel-storage.com");
  } catch {
    return false;
  }
}

function splitCloudinaryUploadPath(
  url: string,
): { head: string; tail: string } | null {
  const index = url.indexOf(CLOUDINARY_UPLOAD_MARKER);
  if (index === -1) return null;
  return {
    head: url.slice(0, index + CLOUDINARY_UPLOAD_MARKER.length),
    tail: url.slice(index + CLOUDINARY_UPLOAD_MARKER.length),
  };
}

/** Remove existing Cloudinary transform segments while preserving version + public id. */
export function stripCloudinaryTransforms(tail: string): string {
  const segments = tail.split("/");
  while (segments.length > 1) {
    const segment = segments[0] ?? "";
    if (/^v\d+$/.test(segment)) break;
    if (segment.includes(",") || /^[a-z0-9]+_/i.test(segment)) {
      segments.shift();
      continue;
    }
    break;
  }
  return segments.join("/");
}

function buildCloudinaryTransformUrl(url: string, transformation: string): string {
  const parts = splitCloudinaryUploadPath(url);
  if (!parts) return url;
  const cleanTail = stripCloudinaryTransforms(parts.tail);
  if (!cleanTail) return url;
  return `${parts.head}${transformation}/${cleanTail}`;
}

/**
 * PDP main stage — large enough for ~600–750px display on retina (target 1600px wide).
 * Preserves source aspect ratio; CSS `object-fit: cover` handles square framing.
 */
export function getPdpMainImageUrl(url: string | null | undefined): string | null {
  if (!url || !isValidImageSrc(url)) return null;
  const trimmed = url.trim();
  if (!isCloudinaryImageUrl(trimmed)) return trimmed;
  return buildCloudinaryTransformUrl(trimmed, "w_1600,c_limit,q_92,f_auto");
}

/**
 * PDP zoom/lightbox — dedicated high-resolution delivery, not the main-stage candidate.
 */
export function getPdpZoomImageUrl(url: string | null | undefined): string | null {
  if (!url || !isValidImageSrc(url)) return null;
  const trimmed = url.trim();
  if (!isCloudinaryImageUrl(trimmed)) return trimmed;
  return buildCloudinaryTransformUrl(trimmed, "w_2400,h_2400,c_limit,q_95,f_auto");
}

/** Thumbnail rail — small transform only for Cloudinary sources. */
export function getPdpThumbnailImageUrl(url: string | null | undefined): string | null {
  if (!url || !isValidImageSrc(url)) return null;
  const trimmed = url.trim();
  if (!isCloudinaryImageUrl(trimmed)) return trimmed;
  return buildCloudinaryTransformUrl(trimmed, "w_144,h_144,c_fill,q_80,f_auto");
}
