/**
 * Client-safe mirror of media-content-intelligence.service's ROLE_SUITABILITY_MAP and
 * inferSuggestedSuitabilities. Kept separate from the services/ folder so client components
 * (e.g. MediaLibraryClient) never need to import a "service" module for a pure, static lookup.
 * Keep in sync with src/features/media/services/media-content-intelligence.service.ts.
 */
import type { MediaContentSuitability } from "@prisma/client";
import {
  MEDIA_CONTENT_SUITABILITY_LABELS,
  validateMediaContentSuitability,
} from "@/features/media/media-bundle-presets";

const ROLE_SUITABILITY_MAP: Record<string, MediaContentSuitability[]> = {
  HERO: ["LANDING_HERO", "FEATURED_IMAGE", "OG_IMAGE"],
  FEATURED: ["FEATURED_IMAGE", "BLOG_COVER"],
  PRODUCT_MAIN: ["PRODUCT_GALLERY", "FEATURED_IMAGE", "OG_IMAGE"],
  PRODUCT_DETAIL: ["PRODUCT_DETAIL", "BLOG_INLINE"],
  GALLERY: ["PRODUCT_GALLERY", "BLOG_INLINE"],
  PROCESS: ["PROCESS_STEP", "BLOG_INLINE", "CASE_STUDY"],
  FACTORY: ["FACTORY_STORY", "BLOG_INLINE", "CASE_STUDY"],
  MATERIAL: ["MATERIAL_DETAIL", "BLOG_INLINE", "SPECIFICATION"],
  PRINTING: ["TECHNIQUE_DETAIL", "PROCESS_STEP", "BLOG_INLINE"],
  EMBROIDERY: ["TECHNIQUE_DETAIL", "PROCESS_STEP", "BLOG_INLINE"],
  CUSTOMER_LOGO: ["TESTIMONIAL", "CASE_STUDY"],
  TESTIMONIAL: ["TESTIMONIAL", "CASE_STUDY"],
  SOCIAL: ["SOCIAL_POST"],
  DOCUMENTATION: ["DOCUMENTATION", "PRESENTATION"],
  OG_IMAGE: ["OG_IMAGE", "FEATURED_IMAGE"],
  BACKGROUND: ["BACKGROUND"],
  TEAM: ["TEAM_PROFILE"],
  PACKAGING: ["PRODUCT_DETAIL", "CATALOGUE"],
};

function normalizeContentSuitabilities(
  values: Array<MediaContentSuitability | string> | null | undefined,
): MediaContentSuitability[] {
  if (!values?.length) return [];
  const seen = new Set<string>();
  const result: MediaContentSuitability[] = [];
  for (const raw of values) {
    const validated = validateMediaContentSuitability(raw);
    if (!validated) continue;
    if (seen.has(validated)) continue;
    seen.add(validated);
    result.push(validated);
  }
  return result;
}

/** Deterministic advisory suggestions from role code. Does not auto-save. */
export function inferSuggestedSuitabilities(input: {
  roleCode?: string | null;
}): MediaContentSuitability[] {
  const code = input.roleCode?.trim().toUpperCase();
  if (!code) return [];
  return normalizeContentSuitabilities(ROLE_SUITABILITY_MAP[code] ?? []);
}

export { MEDIA_CONTENT_SUITABILITY_LABELS, normalizeContentSuitabilities };
