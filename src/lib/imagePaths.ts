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

/** Allowed image filename extensions for publishable local upload files. */
export const PUBLISHABLE_IMAGE_EXTENSIONS = [
  "jpg",
  "jpeg",
  "png",
  "webp",
  "gif",
  "svg",
  "avif",
] as const;

const PUBLISHABLE_IMAGE_EXTENSION_PATTERN = /\.(jpg|jpeg|png|webp|gif|svg|avif)$/i;

const IMAGE_EXTENSIONS = /\.(jpg|jpeg|png|webp|gif|svg|avif)(\?.*)?$/i;

/** Route namespaces that must never satisfy publish image requirements. */
const BLOCKED_LOCAL_IMAGE_PREFIXES = ["/api/", "/admin/", "/quan-tri/"] as const;

const APPROVED_UPLOAD_ROOTS = Object.values(UPLOAD_PATHS);

/** Encoded or literal traversal / separator signals in a pathname (case-insensitive). */
const RAW_PATH_TRAVERSAL_PATTERN =
  /(?:\.\.|\\|%2e|%2f|%5c|%252e|%252f|%255c)/i;

function extractLocalPathname(src: string): string | null {
  const trimmed = src.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return null;

  const queryIndex = trimmed.indexOf("?");
  const hashIndex = trimmed.indexOf("#");
  let end = trimmed.length;
  if (queryIndex >= 0) end = Math.min(end, queryIndex);
  if (hashIndex >= 0) end = Math.min(end, hashIndex);

  const pathname = trimmed.slice(0, end);
  if (!pathname || pathname === "/") return null;
  return pathname;
}

function safeDecodePathname(pathname: string): string | null {
  if (pathname.includes("\\")) return null;
  if (RAW_PATH_TRAVERSAL_PATTERN.test(pathname)) return null;

  let current = pathname;
  for (let pass = 0; pass < 3; pass += 1) {
    if (!/%[0-9A-Fa-f]{0,2}/.test(current)) break;
    try {
      const decoded = decodeURIComponent(current);
      if (decoded === current) break;
      current = decoded;
    } catch {
      return null;
    }
    if (current.includes("\\")) return null;
    if (RAW_PATH_TRAVERSAL_PATTERN.test(current)) return null;
  }

  return current;
}

function normalizeAbsolutePath(pathname: string): string | null {
  const segments = pathname.split("/");
  const normalized: string[] = [];

  for (const segment of segments) {
    if (!segment || segment === ".") continue;
    if (segment === "..") return null;
    normalized.push(segment);
  }

  return `/${normalized.join("/")}`;
}

function hasPublishableFilename(pathname: string): boolean {
  const filename = pathname.split("/").filter(Boolean).pop() ?? "";
  if (!filename) return false;
  return PUBLISHABLE_IMAGE_EXTENSION_PATTERN.test(filename);
}

function isUnderApprovedUploadRoot(pathname: string): boolean {
  const matchedBase = APPROVED_UPLOAD_ROOTS.find(
    (base) => pathname === base || pathname.startsWith(`${base}/`),
  );
  if (!matchedBase) return false;
  if (pathname === matchedBase || pathname.endsWith("/")) return false;

  const relativePath = pathname.slice(matchedBase.length);
  if (!relativePath.startsWith("/") || relativePath === "/") return false;

  const segments = relativePath.split("/").filter(Boolean);
  if (!segments.length) return false;
  if (segments.some((segment) => segment === "." || segment === "..")) return false;

  return hasPublishableFilename(pathname);
}

/**
 * Publish gate: local paths must point to a real file under an approved public upload directory.
 */
export function isPublishableLocalImagePath(src: string): boolean {
  const pathname = extractLocalPathname(src);
  if (!pathname) return false;

  const lower = pathname.toLowerCase();
  for (const prefix of BLOCKED_LOCAL_IMAGE_PREFIXES) {
    if (lower.startsWith(prefix) || lower === prefix.slice(0, -1)) return false;
  }

  const decoded = safeDecodePathname(pathname);
  if (!decoded) return false;

  const normalized = normalizeAbsolutePath(decoded);
  if (!normalized) return false;

  return isUnderApprovedUploadRoot(normalized);
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
