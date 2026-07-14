import type { MediaContentSuitability } from "@prisma/client";
import {
  MEDIA_CONTENT_SUITABILITIES,
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

export function normalizeContentSuitabilities(
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

export function mergeContentSuitabilities(
  existing: MediaContentSuitability[] | null | undefined,
  add?: Array<MediaContentSuitability | string> | null,
  remove?: Array<MediaContentSuitability | string> | null,
): MediaContentSuitability[] {
  const base = normalizeContentSuitabilities(existing);
  const removeSet = new Set(normalizeContentSuitabilities(remove));
  const filtered = base.filter((item) => !removeSet.has(item));
  return normalizeContentSuitabilities([...filtered, ...(add ?? [])]);
}

export function parseContentSuitabilitiesOrThrow(
  values: unknown,
  message = "Phù hợp nội dung không hợp lệ",
): MediaContentSuitability[] {
  if (values === undefined || values === null) return [];
  if (!Array.isArray(values)) throw new Error(message);
  for (const item of values) {
    if (!validateMediaContentSuitability(item)) {
      throw new Error(`${message}: ${String(item)}`);
    }
  }
  return normalizeContentSuitabilities(values as string[]);
}

/** Deterministic advisory suggestions from role code. Does not auto-save. */
export function inferSuggestedSuitabilities(input: {
  roleCode?: string | null;
}): MediaContentSuitability[] {
  const code = input.roleCode?.trim().toUpperCase();
  if (!code) return [];
  return normalizeContentSuitabilities(ROLE_SUITABILITY_MAP[code] ?? []);
}

export function calculateSuitabilityScore(
  assetSuitabilities: MediaContentSuitability[] | null | undefined,
  requested: MediaContentSuitability[] | null | undefined,
): { score: number; matched: MediaContentSuitability[] } {
  const asset = new Set(normalizeContentSuitabilities(assetSuitabilities));
  const matched = normalizeContentSuitabilities(requested).filter((item) => asset.has(item));
  return { score: matched.length ? matched.length * 10 : 0, matched };
}

export function getContentSuitabilityLabels(
  values: MediaContentSuitability[] | null | undefined,
): Array<{ value: MediaContentSuitability; label: string }> {
  return normalizeContentSuitabilities(values).map((value) => ({
    value,
    label: MEDIA_CONTENT_SUITABILITY_LABELS[value],
  }));
}

export function isValidContentSuitabilityList(values: unknown): boolean {
  if (!Array.isArray(values)) return false;
  return values.every((item) => validateMediaContentSuitability(item) != null);
}

export { MEDIA_CONTENT_SUITABILITIES, MEDIA_CONTENT_SUITABILITY_LABELS };
