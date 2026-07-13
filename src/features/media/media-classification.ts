/**
 * Central Media DAM classification compatibility layer.
 *
 * Synchronization rules:
 * 1. Legacy folder update → update folder; sync libraryId when mapping is deterministic.
 * 2. Legacy usageType update → update usageType; sync roleId when mapping is deterministic.
 * 3. Library update → update libraryId; sync legacy folder to nearest compatible value,
 *    otherwise GENERAL. Never moves physical Cloudinary/R2 objects.
 * 4. Role update → update roleId; sync legacy usageType when deterministic, otherwise GENERAL.
 *
 * Legacy fields `folder` and `usageType` remain for compatibility.
 * New Media Library code should prefer libraryId and roleId.
 */

import type {
  MediaFolder,
  MediaOrientation,
  MediaUsageType,
  MediaVisibility,
} from "@prisma/client";

export const SYSTEM_MEDIA_LIBRARY_IDS = {
  PRODUCT: "ml_product",
  MANUFACTURING: "ml_manufacturing",
  MARKETING: "ml_marketing",
  BRANDING: "ml_branding",
  BLOG: "ml_blog",
  HOMEPAGE: "ml_homepage",
  CUSTOMER: "ml_customer",
  CASE_STUDY: "ml_case_study",
  DEALER: "ml_dealer",
  CORPORATE_GIFT: "ml_corporate_gift",
  UNIFORM: "ml_uniform",
  TECH_PACK: "ml_tech_pack",
  GENERAL: "ml_general",
} as const;

export const SYSTEM_MEDIA_ROLE_IDS = {
  HERO: "mr_hero",
  FEATURED: "mr_featured",
  THUMBNAIL: "mr_thumbnail",
  GALLERY: "mr_gallery",
  PRODUCT_MAIN: "mr_product_main",
  PRODUCT_DETAIL: "mr_product_detail",
  COVER: "mr_cover",
  BACKGROUND: "mr_background",
  LOGO: "mr_logo",
  ICON: "mr_icon",
  ILLUSTRATION: "mr_illustration",
  PROCESS: "mr_process",
  FACTORY: "mr_factory",
  MATERIAL: "mr_material",
  PRINTING: "mr_printing",
  EMBROIDERY: "mr_embroidery",
  CUSTOMER_LOGO: "mr_customer_logo",
  CASE_STUDY: "mr_case_study",
  SOCIAL: "mr_social",
  OG_IMAGE: "mr_og_image",
  DOCUMENTATION: "mr_documentation",
  GENERAL: "mr_general",
} as const;

export type SystemLibraryCode = keyof typeof SYSTEM_MEDIA_LIBRARY_IDS;
export type SystemRoleCode = keyof typeof SYSTEM_MEDIA_ROLE_IDS;

export const VALID_MEDIA_VISIBILITIES: MediaVisibility[] = ["PUBLIC", "INTERNAL", "PRIVATE"];
export const VALID_MEDIA_ORIENTATIONS: MediaOrientation[] = [
  "SQUARE",
  "LANDSCAPE",
  "PORTRAIT",
  "UNKNOWN",
];

const LEGACY_FOLDER_TO_LIBRARY_CODE: Record<MediaFolder, SystemLibraryCode> = {
  PRODUCTS: "PRODUCT",
  CATEGORIES: "PRODUCT",
  CLIENTS: "CUSTOMER",
  CASE_STUDIES: "CASE_STUDY",
  BRANDING: "BRANDING",
  BLOG: "BLOG",
  GENERAL: "GENERAL",
};

const LEGACY_USAGE_TO_ROLE_CODE: Record<MediaUsageType, SystemRoleCode> = {
  PRODUCT: "PRODUCT_MAIN",
  BLOG: "FEATURED",
  KNOWLEDGE_BASE: "DOCUMENTATION",
  GENERAL: "GENERAL",
};

/** Nearest compatible legacy folder for a library code. Non-mapped libraries → GENERAL. */
const LIBRARY_CODE_TO_LEGACY_FOLDER: Partial<Record<string, MediaFolder>> = {
  PRODUCT: "PRODUCTS",
  CUSTOMER: "CLIENTS",
  CASE_STUDY: "CASE_STUDIES",
  BRANDING: "BRANDING",
  BLOG: "BLOG",
  GENERAL: "GENERAL",
  MANUFACTURING: "GENERAL",
  MARKETING: "GENERAL",
  HOMEPAGE: "GENERAL",
  DEALER: "GENERAL",
  CORPORATE_GIFT: "GENERAL",
  UNIFORM: "GENERAL",
  TECH_PACK: "GENERAL",
};

/** Nearest compatible legacy usageType for a role code. Non-mapped roles → GENERAL. */
const ROLE_CODE_TO_LEGACY_USAGE: Partial<Record<string, MediaUsageType>> = {
  PRODUCT_MAIN: "PRODUCT",
  PRODUCT_DETAIL: "PRODUCT",
  GALLERY: "PRODUCT",
  FEATURED: "BLOG",
  HERO: "BLOG",
  COVER: "BLOG",
  OG_IMAGE: "BLOG",
  DOCUMENTATION: "KNOWLEDGE_BASE",
  GENERAL: "GENERAL",
};

export function resolveDefaultLibraryCodeFromLegacyFolder(
  folder: MediaFolder,
): SystemLibraryCode {
  return LEGACY_FOLDER_TO_LIBRARY_CODE[folder] ?? "GENERAL";
}

export function resolveDefaultRoleCodeFromLegacyUsage(
  usageType: MediaUsageType,
): SystemRoleCode {
  return LEGACY_USAGE_TO_ROLE_CODE[usageType] ?? "GENERAL";
}

export function resolveDefaultLibraryIdFromLegacyFolder(folder: MediaFolder): string {
  return SYSTEM_MEDIA_LIBRARY_IDS[resolveDefaultLibraryCodeFromLegacyFolder(folder)];
}

export function resolveDefaultRoleIdFromLegacyUsage(usageType: MediaUsageType): string {
  return SYSTEM_MEDIA_ROLE_IDS[resolveDefaultRoleCodeFromLegacyUsage(usageType)];
}

export function resolveLegacyFolderFromLibraryCode(code: string): MediaFolder {
  return LIBRARY_CODE_TO_LEGACY_FOLDER[code.toUpperCase()] ?? "GENERAL";
}

export function resolveLegacyUsageTypeFromRoleCode(code: string): MediaUsageType {
  return ROLE_CODE_TO_LEGACY_USAGE[code.toUpperCase()] ?? "GENERAL";
}

export function deriveMediaOrientation(
  width: number | null | undefined,
  height: number | null | undefined,
): MediaOrientation {
  if (width == null || height == null || width <= 0 || height <= 0) return "UNKNOWN";
  if (width === height) return "SQUARE";
  if (width > height) return "LANDSCAPE";
  return "PORTRAIT";
}

export function normalizeMediaStringList(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result;
}

export function normalizeMediaTags(tags: string[]): string[] {
  return normalizeMediaStringList(tags);
}

export function normalizeMediaKeywords(keywords: string[]): string[] {
  return normalizeMediaStringList(keywords);
}

export function validateMediaVisibility(value: unknown): MediaVisibility | null {
  if (typeof value !== "string") return null;
  return VALID_MEDIA_VISIBILITIES.includes(value as MediaVisibility)
    ? (value as MediaVisibility)
    : null;
}

export function validateMediaOrientation(value: unknown): MediaOrientation | null {
  if (typeof value !== "string") return null;
  return VALID_MEDIA_ORIENTATIONS.includes(value as MediaOrientation)
    ? (value as MediaOrientation)
    : null;
}

export function normalizeMasterDataCode(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_]/g, "");
}

export function emptyToNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export const MEDIA_DISCOVERY_MAX_LIMIT = 50;
export const MEDIA_DISCOVERY_CANDIDATE_LIMIT = 400;

/** SEO discovery presets for content selection conventions. */
export const MEDIA_DISCOVERY_PRESETS = {
  featuredArticle: {
    roles: ["FEATURED", "HERO"] as const,
    orientation: "LANDSCAPE" as const,
    visibility: "PUBLIC" as const,
  },
  inlineArticle: {
    roles: [
      "ILLUSTRATION",
      "PROCESS",
      "FACTORY",
      "MATERIAL",
      "PRINTING",
      "EMBROIDERY",
      "PRODUCT_DETAIL",
    ] as const,
    visibility: "PUBLIC" as const,
  },
  ogImage: {
    roles: ["OG_IMAGE", "FEATURED", "HERO"] as const,
    orientation: "LANDSCAPE" as const,
    visibility: "PUBLIC" as const,
  },
  productContent: {
    libraries: ["PRODUCT"] as const,
    roles: ["PRODUCT_MAIN", "PRODUCT_DETAIL", "GALLERY"] as const,
  },
  manufacturingContent: {
    libraries: ["MANUFACTURING"] as const,
    roles: ["FACTORY", "PROCESS", "MATERIAL", "PRINTING", "EMBROIDERY"] as const,
  },
  corporateGiftContent: {
    libraries: ["CORPORATE_GIFT", "PRODUCT"] as const,
  },
} as const;
