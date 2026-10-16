import { isValidImageSrc } from "@/lib/imagePaths";

const CLOUDINARY_UPLOAD_MARKER = "/image/upload/";

export function isCloudinaryImageUrl(url: string): boolean {
  try {
    return new URL(url).hostname.includes("res.cloudinary.com");
  } catch {
    return false;
  }
}

function splitCloudinaryUploadPath(url: string): { head: string; tail: string } | null {
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

export function buildCloudinaryTransformUrl(url: string, transformation: string): string {
  const parts = splitCloudinaryUploadPath(url);
  if (!parts) return url;
  const cleanTail = stripCloudinaryTransforms(parts.tail);
  if (!cleanTail) return url;
  return `${parts.head}${transformation}/${cleanTail}`;
}

/** Default public web delivery — optimized, not the stored original URL. */
export function getWebDeliveryMediaUrl(url: string | null | undefined): string | null {
  if (!url || !isValidImageSrc(url)) return null;
  const trimmed = url.trim();
  if (!isCloudinaryImageUrl(trimmed)) return trimmed;
  return buildCloudinaryTransformUrl(trimmed, "w_1600,c_limit,q_auto:good,f_auto");
}

export function getCardDeliveryMediaUrl(url: string | null | undefined): string | null {
  if (!url || !isValidImageSrc(url)) return null;
  const trimmed = url.trim();
  if (!isCloudinaryImageUrl(trimmed)) return trimmed;
  return buildCloudinaryTransformUrl(trimmed, "w_800,c_limit,q_auto:good,f_auto");
}

export function getThumbnailDeliveryMediaUrl(url: string | null | undefined): string | null {
  if (!url || !isValidImageSrc(url)) return null;
  const trimmed = url.trim();
  if (!isCloudinaryImageUrl(trimmed)) return trimmed;
  return buildCloudinaryTransformUrl(trimmed, "w_144,h_144,c_fill,q_80,f_auto");
}

export function getZoomDeliveryMediaUrl(url: string | null | undefined): string | null {
  if (!url || !isValidImageSrc(url)) return null;
  const trimmed = url.trim();
  if (!isCloudinaryImageUrl(trimmed)) return trimmed;
  return buildCloudinaryTransformUrl(trimmed, "w_2400,h_2400,c_limit,q_95,f_auto");
}
