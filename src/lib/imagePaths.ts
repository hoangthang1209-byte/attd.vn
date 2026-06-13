/**
 * Image upload architecture — drop files into /public/uploads/* folders.
 * Update config filenames only; no code changes needed for future image swaps.
 */

export const UPLOAD_PATHS = {
  products: "/uploads/products",
  categories: "/uploads/categories",
  caseStudies: "/uploads/case-studies",
  clients: "/uploads/clients",
} as const;

export type UploadFolder = keyof typeof UPLOAD_PATHS;

export type PlaceholderVariant = "product" | "category" | "client" | "generic";

/**
 * Resolve an upload filename or pass through absolute / remote URLs unchanged.
 * Returns null when no image is configured — use ImagePlaceholder as fallback.
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
    return trimmed;
  }

  return `${UPLOAD_PATHS[folder]}/${trimmed}`;
}

/** Check whether a resolved image URL points to an upload folder path. */
export function isUploadPath(src: string): boolean {
  return Object.values(UPLOAD_PATHS).some((base) => src.startsWith(base));
}
