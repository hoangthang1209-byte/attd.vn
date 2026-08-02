import type { MediaVisibility } from "@prisma/client";
import type { AssetHealthBreakdown } from "@/features/media/intelligence/intelligence.types";
import { calculateMediaSeoScore } from "@/features/media/services/media-intelligence.service";

export type AssetHealthInput = {
  altText?: string | null;
  title?: string | null;
  caption?: string | null;
  keywords?: string[] | null;
  subjectTerms?: string[] | null;
  width?: number | null;
  height?: number | null;
  orientation?: string | null;
  visibility?: MediaVisibility | null;
  duplicateStatus?: string | null;
  duplicateOfId?: string | null;
  contentSuitabilities?: string[] | null;
  seoScore?: number | null;
  bundleCount?: number;
  usageCount?: number;
  libraryId?: string | null;
  roleId?: string | null;
};

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

/**
 * Composite asset health. Does not block upload.
 */
export function calculateAssetHealth(input: AssetHealthInput): AssetHealthBreakdown {
  const issues: string[] = [];
  const seo =
    input.seoScore ??
    calculateMediaSeoScore({
      title: input.title,
      altText: input.altText,
      caption: input.caption,
      keywords: input.keywords,
      subjectTerms: input.subjectTerms,
      libraryId: input.libraryId,
      roleId: input.roleId,
      visibility: input.visibility,
      orientation: input.orientation as never,
      width: input.width,
      height: input.height,
    });

  const accessibility = input.altText?.trim()
    ? input.altText.trim().length >= 8
      ? 100
      : 70
    : 0;
  if (!input.altText?.trim()) issues.push("missing_alt");

  const minDim = Math.min(input.width ?? 0, input.height ?? 0);
  let resolution = 40;
  if (minDim >= 1600) resolution = 100;
  else if (minDim >= 1200) resolution = 85;
  else if (minDim >= 800) resolution = 70;
  else if (minDim >= 400) resolution = 50;
  else if (minDim > 0) {
    resolution = 25;
    issues.push("low_resolution");
  } else {
    resolution = 35;
    issues.push("unknown_dimensions");
  }

  const crop =
    input.orientation && input.orientation !== "UNKNOWN"
      ? input.orientation === "PORTRAIT"
        ? 70
        : 90
      : 50;

  const alt = accessibility;
  const caption = input.caption?.trim() ? 100 : 40;
  if (!input.caption?.trim()) issues.push("missing_caption");

  let duplicate = 100;
  if (input.duplicateOfId || input.duplicateStatus === "CONFIRMED_DUPLICATE") {
    duplicate = 20;
    issues.push("confirmed_duplicate");
  } else if (input.duplicateStatus === "POSSIBLE_DUPLICATE") {
    duplicate = 55;
    issues.push("possible_duplicate");
  }

  let visibility = 80;
  if (input.visibility === "PUBLIC") visibility = 100;
  else if (input.visibility === "INTERNAL") visibility = 60;
  else if (input.visibility === "PRIVATE") {
    visibility = 30;
    issues.push("private_visibility");
  }

  const bundle = (input.bundleCount ?? 0) > 0 ? 100 : 45;
  if (!(input.bundleCount ?? 0)) issues.push("not_in_bundle");

  const suitability = (input.contentSuitabilities?.length ?? 0) > 0 ? 100 : 40;
  if (!(input.contentSuitabilities?.length ?? 0)) issues.push("missing_suitability");

  const usage = Math.min(100, 40 + (input.usageCount ?? 0) * 15);

  const total = clamp(
    seo * 0.2 +
      accessibility * 0.15 +
      resolution * 0.12 +
      crop * 0.05 +
      alt * 0.1 +
      caption * 0.08 +
      duplicate * 0.1 +
      visibility * 0.08 +
      bundle * 0.06 +
      suitability * 0.03 +
      usage * 0.03,
  );

  const grade =
    total >= 85 ? "excellent" : total >= 70 ? "good" : total >= 50 ? "fair" : "poor";

  return {
    seo: clamp(seo),
    accessibility: clamp(accessibility),
    resolution: clamp(resolution),
    crop: clamp(crop),
    alt: clamp(alt),
    caption: clamp(caption),
    duplicate: clamp(duplicate),
    visibility: clamp(visibility),
    bundle: clamp(bundle),
    suitability: clamp(suitability),
    usage: clamp(usage),
    total,
    grade,
    issues,
  };
}
