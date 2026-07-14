import type {
  MediaAiProcessingStatus,
  MediaDuplicateStatus,
  MediaSeoReadinessStatus,
} from "@prisma/client";
import type { MediaAssetListFilters } from "@/features/media/services/media.service";

/**
 * Quick metadata-health presets surfaced in the Media Library filter bar.
 * Some presets require OR-across-fields logic that a single
 * `MediaAssetListFilters` object cannot express (Prisma `where` is AND-only
 * across top-level keys here) — use `mediaAssetMatchesIntelligencePreset`
 * for exact matching against already-loaded assets, and
 * `mediaIntelligencePresetToFilterParams` as a best-effort server-side
 * approximation / query param source.
 */
export type MediaIntelligenceQuickPreset =
  | "seo_incomplete"
  | "seo_ready"
  | "missing_alt"
  | "missing_subject"
  | "ai_not_processed"
  | "duplicates";

export const MEDIA_INTELLIGENCE_QUICK_PRESETS: MediaIntelligenceQuickPreset[] = [
  "seo_incomplete",
  "seo_ready",
  "missing_alt",
  "missing_subject",
  "ai_not_processed",
  "duplicates",
];

export const MEDIA_INTELLIGENCE_QUICK_PRESET_LABELS: Record<MediaIntelligenceQuickPreset, string> = {
  seo_incomplete: "SEO chưa đạt",
  seo_ready: "SEO đã sẵn sàng",
  missing_alt: "Thiếu alt text",
  missing_subject: "Thiếu chủ thể",
  ai_not_processed: "Chưa xử lý AI",
  duplicates: "Nghi trùng lặp",
};

/** Vietnamese labels for MediaSeoReadinessStatus, for badges and filter dropdowns. */
export const MEDIA_SEO_READINESS_LABELS: Record<MediaSeoReadinessStatus, string> = {
  INCOMPLETE: "Chưa hoàn thiện",
  BASIC: "Cơ bản",
  READY: "Sẵn sàng",
  EXCELLENT: "Xuất sắc",
};

/** Score threshold matching media-intelligence.service's READY boundary. */
export const MEDIA_SEO_READY_SCORE_THRESHOLD = 65;

/**
 * Best-effort mapping of a quick preset to `MediaAssetListFilters` fields.
 * For presets with OR semantics (seo_incomplete, duplicates) this returns a
 * reasonable single-condition approximation; prefer
 * `mediaAssetMatchesIntelligencePreset` when filtering an in-memory list.
 */
export function mediaIntelligencePresetToFilterParams(
  preset: MediaIntelligenceQuickPreset,
): Partial<MediaAssetListFilters> {
  switch (preset) {
    case "seo_incomplete":
      return { seoReadinessStatus: "INCOMPLETE" };
    case "seo_ready":
      return { minimumSeoScore: MEDIA_SEO_READY_SCORE_THRESHOLD };
    case "missing_alt":
      return { hasAltText: false };
    case "missing_subject":
      return { hasSubject: false };
    case "ai_not_processed":
      return { aiProcessingStatus: "NOT_PROCESSED" };
    case "duplicates":
      return { duplicateStatus: "POSSIBLE_DUPLICATE" };
    default:
      return {};
  }
}

/** Serializes a preset's filter params to URLSearchParams-compatible entries. */
export function mediaIntelligencePresetToQueryEntries(
  preset: MediaIntelligenceQuickPreset,
): Array<[string, string]> {
  const filters = mediaIntelligencePresetToFilterParams(preset);
  const entries: Array<[string, string]> = [];
  if (filters.seoReadinessStatus) entries.push(["seoReadinessStatus", filters.seoReadinessStatus]);
  if (typeof filters.minimumSeoScore === "number") {
    entries.push(["minimumSeoScore", String(filters.minimumSeoScore)]);
  }
  if (typeof filters.hasAltText === "boolean") {
    entries.push(["hasAltText", String(filters.hasAltText)]);
  }
  if (typeof filters.hasSubject === "boolean") {
    entries.push(["hasSubject", String(filters.hasSubject)]);
  }
  if (filters.aiProcessingStatus) entries.push(["aiProcessingStatus", filters.aiProcessingStatus]);
  if (filters.duplicateStatus) entries.push(["duplicateStatus", filters.duplicateStatus]);
  return entries;
}

export type MediaIntelligenceAssetLike = {
  seoScore: number;
  seoReadinessStatus: MediaSeoReadinessStatus;
  altText?: string | null;
  subjectTerms?: string[] | null;
  aiProcessingStatus: MediaAiProcessingStatus;
  duplicateStatus: MediaDuplicateStatus;
};

/** Exact predicate for a preset, including OR-logic cases the filter object can't express. */
export function mediaAssetMatchesIntelligencePreset(
  asset: MediaIntelligenceAssetLike,
  preset: MediaIntelligenceQuickPreset,
): boolean {
  switch (preset) {
    case "seo_incomplete":
      return asset.seoReadinessStatus === "INCOMPLETE" || asset.seoScore < MEDIA_SEO_READY_SCORE_THRESHOLD;
    case "seo_ready":
      return asset.seoReadinessStatus === "READY" || asset.seoReadinessStatus === "EXCELLENT";
    case "missing_alt":
      return !asset.altText?.trim();
    case "missing_subject":
      return !asset.subjectTerms?.some((term) => term.trim());
    case "ai_not_processed":
      return asset.aiProcessingStatus === "NOT_PROCESSED";
    case "duplicates":
      return (
        asset.duplicateStatus === "POSSIBLE_DUPLICATE" || asset.duplicateStatus === "CONFIRMED_DUPLICATE"
      );
    default:
      return true;
  }
}
