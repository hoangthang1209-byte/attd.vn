import type { MediaBundleContentType, MediaBundleSlotType, MediaOrientation } from "@prisma/client";
import {
  discoverMediaAssets,
  type MediaDiscoveryInput,
  type MediaDiscoveryResult,
} from "@/features/media/services/media-discovery.service";
import {
  getBundlePreset,
  SLOT_DISCOVERY_PROFILES,
  validateMediaBundleContentType,
} from "@/features/media/media-bundle-presets";

export type MediaCoverageInput = {
  query?: string;
  libraries?: string[];
  roles?: string[];
  subjects?: string[];
  industries?: string[];
  useCases?: string[];
  orientation?: MediaOrientation;
  minimumSeoScore?: number;
  recommendedMinimum?: number;
};

export type MediaCoverageResult = {
  totalSuitable: number;
  excellent: number;
  ready: number;
  basic: number;
  insufficient: boolean;
  recommendedMinimum: number;
  gaps: string[];
  sampleAssets: MediaDiscoveryResult[];
  coverageLevel: "critical" | "insufficient" | "basic" | "good" | "strong";
};

export async function assessMediaCoverage(
  input: MediaCoverageInput,
): Promise<MediaCoverageResult> {
  const recommendedMinimum = input.recommendedMinimum ?? 6;
  const discoveryInput: MediaDiscoveryInput = {
    query: input.query,
    libraries: input.libraries,
    roles: input.roles,
    subjects: input.subjects,
    industries: input.industries,
    useCases: input.useCases,
    orientation: input.orientation,
    minimumSeoScore: input.minimumSeoScore ?? 40,
    limit: 24,
  };

  const sampleAssets = await discoverMediaAssets(discoveryInput);
  const totalSuitable = sampleAssets.length;

  let excellent = 0;
  let ready = 0;
  let basic = 0;
  for (const item of sampleAssets) {
    const status = item.asset.seoReadinessStatus;
    if (status === "EXCELLENT") excellent += 1;
    else if (status === "READY") ready += 1;
    else if (status === "BASIC") basic += 1;
  }

  const gaps: string[] = [];
  if (totalSuitable === 0) gaps.push("critical_gap");
  if (totalSuitable < recommendedMinimum) gaps.push("below_recommended_minimum");
  if (!input.subjects?.length && input.query) gaps.push("suggest_subject_filter");
  if (excellent + ready === 0 && totalSuitable > 0) gaps.push("low_seo_readiness");

  let coverageLevel: MediaCoverageResult["coverageLevel"];
  if (totalSuitable === 0) coverageLevel = "critical";
  else if (totalSuitable <= 2) coverageLevel = "insufficient";
  else if (totalSuitable <= 5) coverageLevel = "basic";
  else if (totalSuitable <= 10) coverageLevel = "good";
  else coverageLevel = "strong";

  return {
    totalSuitable,
    excellent,
    ready,
    basic,
    insufficient: totalSuitable < 3,
    recommendedMinimum,
    gaps,
    sampleAssets,
    coverageLevel,
  };
}

/* -------------------------------------------------------------------------- */
/* Content bundle coverage planning (Sprint 10.4)                            */
/* -------------------------------------------------------------------------- */

export type MediaContentPlanInput = {
  contentType: MediaBundleContentType | string;
  query?: string;
  subjectTerms?: string[];
  industryTerms?: string[];
  useCaseTerms?: string[];
  techniqueTerms?: string[];
  minimumSeoScore?: number;
};

export type MediaContentPlanSlotStatus = "MISSING" | "LOW" | "ENOUGH" | "STRONG";
export type MediaContentPlanOverallStatus = "CRITICAL" | "INSUFFICIENT" | "BASIC" | "GOOD" | "STRONG";

export type MediaContentPlanSlot = {
  slotType: MediaBundleSlotType;
  label: string;
  required: boolean;
  recommended: boolean;
  minAssets: number;
  foundCount: number;
  fillRatio: number;
  status: MediaContentPlanSlotStatus;
  orientation?: MediaOrientation;
  sampleAssets: MediaDiscoveryResult[];
};

export type MediaContentPlanResult = {
  contentType: MediaBundleContentType;
  slots: MediaContentPlanSlot[];
  overallScore: number;
  overallStatus: MediaContentPlanOverallStatus;
  recommendations: string[];
};

function orientationHint(orientation?: MediaOrientation): string {
  switch (orientation) {
    case "LANDSCAPE":
      return " ngang";
    case "PORTRAIT":
      return " dọc";
    case "SQUARE":
      return " vuông";
    default:
      return "";
  }
}

function buildContentPlanRecommendations(slots: MediaContentPlanSlot[]): string[] {
  const recommendations: string[] = [];

  for (const slot of slots) {
    if (slot.status === "MISSING") {
      recommendations.push(
        `Bổ sung ${slot.minAssets} ảnh${orientationHint(slot.orientation)} cho vị trí "${slot.label}"${
          slot.required ? " (bắt buộc)" : ""
        } — hiện chưa tìm thấy ảnh phù hợp.`,
      );
    } else if (slot.status === "LOW") {
      const missing = Math.max(1, slot.minAssets - slot.foundCount);
      recommendations.push(
        `Bổ sung ${missing} ảnh${orientationHint(slot.orientation)} cho vị trí "${slot.label}" — hiện có ${slot.foundCount}/${slot.minAssets} ảnh đạt yêu cầu.`,
      );
    }
  }

  if (!recommendations.length) {
    recommendations.push("Thư viện ảnh đã đáp ứng đủ các vị trí quan trọng cho loại nội dung này.");
  }

  return recommendations;
}

/**
 * Plans media coverage for a content type against its bundle preset: for every
 * required or recommended slot, discovers candidate assets (bounded sample) and
 * derives a fill status. Read-only — does not create/modify any MediaBundle records.
 */
export async function planMediaContentCoverage(
  input: MediaContentPlanInput,
): Promise<MediaContentPlanResult> {
  const contentType = validateMediaBundleContentType(input.contentType) ?? "GENERAL";
  const preset = getBundlePreset(contentType);
  const relevantSlots = preset.slots.filter((slot) => slot.required || slot.recommended);

  const slots: MediaContentPlanSlot[] = await Promise.all(
    relevantSlots.map(async (presetSlot) => {
      const profile = SLOT_DISCOVERY_PROFILES[presetSlot.slotType];
      const sampleAssets = await discoverMediaAssets({
        query: input.query,
        subjects: input.subjectTerms,
        industries: input.industryTerms,
        useCases: input.useCaseTerms,
        techniques: input.techniqueTerms,
        roles: profile.roles,
        libraries: profile.libraries,
        orientation: profile.orientation,
        minimumSeoScore: input.minimumSeoScore ?? profile.minimumSeoScore,
        visibility: "PUBLIC",
        limit: 8,
      });

      const minAssets = Math.max(1, presetSlot.minAssets);
      const foundCount = sampleAssets.length;

      let status: MediaContentPlanSlotStatus;
      if (foundCount === 0) status = "MISSING";
      else if (foundCount < minAssets) status = "LOW";
      else if (foundCount >= minAssets * 2) status = "STRONG";
      else status = "ENOUGH";

      return {
        slotType: presetSlot.slotType,
        label: presetSlot.label,
        required: presetSlot.required,
        recommended: presetSlot.recommended,
        minAssets,
        foundCount,
        fillRatio: Math.min(1, foundCount / minAssets),
        status,
        orientation: profile.orientation,
        sampleAssets,
      };
    }),
  );

  const totalWeight = slots.reduce((sum, slot) => sum + (slot.required ? 2 : 1), 0);
  const weightedFill = slots.reduce(
    (sum, slot) => sum + slot.fillRatio * (slot.required ? 2 : 1),
    0,
  );
  const overallScore = totalWeight > 0 ? Math.round((weightedFill / totalWeight) * 100) : 100;

  let overallStatus: MediaContentPlanOverallStatus;
  if (overallScore < 30) overallStatus = "CRITICAL";
  else if (overallScore < 50) overallStatus = "INSUFFICIENT";
  else if (overallScore < 70) overallStatus = "BASIC";
  else if (overallScore < 90) overallStatus = "GOOD";
  else overallStatus = "STRONG";

  return {
    contentType,
    slots,
    overallScore,
    overallStatus,
    recommendations: buildContentPlanRecommendations(slots),
  };
}
