import { isPublishableLocalImagePath, isValidImageSrc } from "@/lib/imagePaths";

/**
 * Canonical public media URL resolution for product PDP/cards and media pickers.
 * Prefer MediaAsset.url; never expose admin/API routes or empty/local-object URLs.
 */

const UNSAFE_PROTOCOL = /^(javascript|data|vbscript|file|blob):/i;

const BLOCKED_PATH_PREFIXES = ["/api/", "/admin/", "/quan-tri/"] as const;

export type PublicMediaAssetLike = {
  url?: string | null;
  publicUrl?: string | null;
  fileUrl?: string | null;
  thumbnailUrl?: string | null;
  imageUrl?: string | null;
  secureUrl?: string | null;
  secure_url?: string | null;
};

export type PublicMediaUrlInput = string | null | undefined | PublicMediaAssetLike;

function isBlockedPublicPath(pathname: string): boolean {
  const lower = pathname.toLowerCase();
  return BLOCKED_PATH_PREFIXES.some(
    (prefix) => lower === prefix.slice(0, -1) || lower.startsWith(prefix),
  );
}

function isLikelyPublicHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    if (!url.hostname || url.hostname === "localhost" || url.hostname === "127.0.0.1") {
      return false;
    }
    if (isBlockedPublicPath(url.pathname)) return false;
    return true;
  } catch {
    return false;
  }
}

function isAllowedLocalPublicPath(value: string): boolean {
  if (!value.startsWith("/") || value.startsWith("//")) return false;
  if (isBlockedPublicPath(value)) return false;
  // Prefer approved upload roots for public product rendering; still accept other
  // non-admin local paths that pass basic src validation (legacy assets).
  if (isPublishableLocalImagePath(value)) return true;
  return isValidImageSrc(value) && !isBlockedPublicPath(value);
}

/** Normalize a single candidate string into a public renderable URL, or null. */
export function normalizePublicMediaUrlCandidate(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed === "#" || trimmed === "null" || trimmed === "undefined") {
    return null;
  }
  if (UNSAFE_PROTOCOL.test(trimmed)) return null;

  if (/^https?:\/\//i.test(trimmed)) {
    // Public storefront: HTTPS only (reject plain http).
    if (!/^https:\/\//i.test(trimmed)) return null;
    return isLikelyPublicHttpsUrl(trimmed) ? trimmed : null;
  }

  if (trimmed.startsWith("/")) {
    return isAllowedLocalPublicPath(trimmed) ? trimmed : null;
  }

  return null;
}

function candidatesFromAsset(asset: PublicMediaAssetLike): string[] {
  return [
    asset.url,
    asset.publicUrl,
    asset.fileUrl,
    asset.secureUrl,
    asset.secure_url,
    asset.imageUrl,
    // thumbnail last — never preferred over canonical file URL
    asset.thumbnailUrl,
  ].filter((value): value is string => typeof value === "string");
}

/**
 * Resolve a public media URL from a raw string or MediaAsset-like record.
 * Returns null when no safe public URL is available (caller should use placeholder).
 */
export function getPublicMediaUrl(assetOrUrl: PublicMediaUrlInput): string | null {
  if (assetOrUrl == null) return null;

  if (typeof assetOrUrl === "string") {
    return normalizePublicMediaUrlCandidate(assetOrUrl);
  }

  for (const candidate of candidatesFromAsset(assetOrUrl)) {
    const resolved = normalizePublicMediaUrlCandidate(candidate);
    if (resolved) return resolved;
  }
  return null;
}

/** Dedupe while preserving order; drops invalid/empty URLs. */
export function uniquePublicMediaUrls(
  values: Iterable<string | null | undefined>,
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const resolved = getPublicMediaUrl(value);
    if (!resolved || seen.has(resolved)) continue;
    seen.add(resolved);
    result.push(resolved);
  }
  return result;
}

/** Deterministic check: non-empty raw reference that cannot be used publicly. */
export function isBrokenPublicMediaReference(value: string | null | undefined): boolean {
  if (value == null) return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  return getPublicMediaUrl(trimmed) == null;
}
