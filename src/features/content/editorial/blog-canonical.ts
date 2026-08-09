/**
 * Safe self-referencing blog canonical helpers.
 * Prefer filling empty canonicals; never overwrite intentional overrides.
 */

import { SITE_URL, canonicalUrl } from "@/lib/seo";
import { validateCanonicalUrl } from "@/features/content/content-publish.types";

export function buildDefaultBlogCanonical(slug: string): string {
  const trimmed = slug.trim().replace(/^\/+|\/+$/g, "");
  return canonicalUrl(`/blog/${trimmed}`);
}

/**
 * Returns the canonical to persist.
 * - Explicit non-empty override wins (must still be valid when provided).
 * - Empty/null → default self-canonical from slug.
 */
export function resolveBlogCanonical(params: {
  slug: string;
  canonicalUrl?: string | null;
}): string {
  const explicit = params.canonicalUrl?.trim() || "";
  if (explicit) return explicit;
  return buildDefaultBlogCanonical(params.slug);
}

/** True when a stored value is already the default self-canonical for this slug. */
export function isDefaultBlogCanonical(slug: string, value: string | null | undefined): boolean {
  if (!value?.trim()) return false;
  return value.trim() === buildDefaultBlogCanonical(slug);
}

export function assertBlogCanonicalWritable(value: string): string | null {
  return validateCanonicalUrl(value);
}

export { SITE_URL };
