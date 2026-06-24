/**
 * Image upload architecture and validation utilities.
 */

export const UPLOAD_PATHS = {
  products: "/uploads/products",
  categories: "/uploads/categories",
  caseStudies: "/uploads/case-studies",
  clients: "/uploads/clients",
} as const;

export type UploadFolder = keyof typeof UPLOAD_PATHS;

export type PlaceholderVariant = "product" | "category" | "client" | "generic";

const IMAGE_EXTENSIONS = /\.(jpg|jpeg|png|webp|gif|svg|avif)(\?.*)?$/i;

/** Route namespaces that must never satisfy publish image requirements. */
const BLOCKED_LOCAL_IMAGE_PREFIXES = ["/api/", "/admin/", "/quan-tri/"] as const;

/**
 * Publish gate: local paths must point to a real file under an approved public upload directory.
 */
export function isPublishableLocalImagePath(src: string): boolean {
  const trimmed = src.trim();
  if (!trimmed.startsWith("/")) return false;
  if (trimmed.includes("..")) return false;
  if (trimmed.length <= 1) return false;

  const lower = trimmed.toLowerCase();
  for (const prefix of BLOCKED_LOCAL_IMAGE_PREFIXES) {
    if (lower.startsWith(prefix) || lower === prefix.slice(0, -1)) return false;
  }

  const matchedBase = Object.values(UPLOAD_PATHS).find(
    (base) => trimmed === base || trimmed.startsWith(`${base}/`),
  );
  if (!matchedBase) return false;
  if (trimmed === matchedBase || trimmed.endsWith("/")) return false;

  const relativePath = trimmed.slice(matchedBase.length);
  if (!relativePath.startsWith("/") || relativePath === "/") return false;

  const segments = relativePath.split("/").filter(Boolean);
  if (!segments.length || segments.some((segment) => segment === ".")) return false;

  const filename = segments[segments.length - 1] ?? "";
  if (!IMAGE_EXTENSIONS.test(filename)) return false;

  return true;
}

/**
 * Resolve an upload filename or pass through absolute / remote URLs unchanged.
 * Returns null when no image is configured.
 */
export function resolveUploadImage(
  folder: UploadFolder,
  filename?: string | null
): string | null {
  if (!filename?.trim()) return null;

  const trimmed = filename.trim();
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("/")
  ) {
    return isValidImageSrc(trimmed) ? trimmed : null;
  }

  const resolved = `${UPLOAD_PATHS[folder]}/${trimmed}`;
  return isValidImageSrc(resolved) ? resolved : null;
}

/** Check whether a resolved image URL points to an upload folder path. */
export function isUploadPath(src: string): boolean {
  return Object.values(UPLOAD_PATHS).some((base) => src.startsWith(base));
}

/** Basic path/URL validation — prevents empty or obviously broken src values. */
export function isValidImageSrc(src?: string | null): boolean {
  if (!src?.trim()) return false;

  const trimmed = src.trim();

  if (trimmed === "#" || trimmed === "null" || trimmed === "undefined") {
    return false;
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      new URL(trimmed);
      return true;
    } catch {
      return false;
    }
  }

  if (trimmed.startsWith("/")) {
    return trimmed.length > 1;
  }

  return IMAGE_EXTENSIONS.test(trimmed);
}

/** Validate aspect ratio within tolerance (e.g. 1 for square, 4/5 for product card). */
export function isAcceptableAspectRatio(
  width: number,
  height: number,
  expected: number,
  tolerance = 0.15
): boolean {
  if (width <= 0 || height <= 0) return false;
  const ratio = width / height;
  return Math.abs(ratio - expected) <= tolerance;
}

/** Safe image src — returns fallback when primary is invalid. */
export function resolveImageWithFallback(
  primary?: string | null,
  fallback?: string | null
): string | null {
  if (primary && isValidImageSrc(primary)) return primary.trim();
  if (fallback && isValidImageSrc(fallback)) return fallback.trim();
  return null;
}

/** Returns true if path looks like a local upload (for readiness checks). */
export function isLocalUploadPath(src: string): boolean {
  return isUploadPath(src) || src.startsWith("/uploads/");
}
