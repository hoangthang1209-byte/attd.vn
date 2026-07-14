import type { MediaOrientation } from "@prisma/client";
import {
  discoverMediaAssets,
  type MediaDiscoveryInput,
  type MediaDiscoveryResult,
} from "@/features/media/services/media-discovery.service";

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
