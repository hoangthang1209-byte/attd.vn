import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  INTELLIGENT_META_KEY,
  type IntelligentMediaMetaBag,
} from "@/features/media/intelligence/intelligence.types";
import { readIntelligentBag } from "@/features/media/intelligence/ingest-pipeline.service";
import { recalculateMediaIntelligenceForIds } from "@/features/media/services/media-intelligence.service";

/**
 * Editor confirms suggested metadata. Never auto-publishes / never forces PUBLIC.
 */
export async function reviewMediaAssetMetadata(input: {
  mediaAssetId: string;
  reviewedBy?: string | null;
  applySuggestions?: boolean;
  overrides?: {
    title?: string | null;
    altText?: string | null;
    caption?: string | null;
    keywords?: string[];
  };
}): Promise<{ ok: true }> {
  const asset = await prisma.mediaAsset.findUnique({ where: { id: input.mediaAssetId } });
  if (!asset) throw new Error("Không tìm thấy MediaAsset.");

  const bag = readIntelligentBag(asset.metadata);
  const suggested = bag?.suggested;

  const data: Prisma.MediaAssetUpdateInput = {};
  if (input.overrides) {
    if ("title" in input.overrides) data.title = input.overrides.title;
    if ("altText" in input.overrides) data.altText = input.overrides.altText;
    if ("caption" in input.overrides) data.caption = input.overrides.caption;
    if (input.overrides.keywords) data.keywords = input.overrides.keywords;
  } else if (input.applySuggestions && suggested) {
    if (!asset.title?.trim() && suggested.title) data.title = suggested.title;
    if (!asset.altText?.trim() && suggested.altText) data.altText = suggested.altText;
    if (!asset.caption?.trim() && suggested.caption) data.caption = suggested.caption;
    if (!asset.keywords.length && suggested.keywords.length) {
      data.keywords = suggested.keywords;
    }
  }

  const nextBag: IntelligentMediaMetaBag = {
    stage: "AVAILABLE",
    suggested: suggested ?? {
      title: asset.title,
      suggestedFilename: null,
      altText: asset.altText,
      caption: asset.caption,
      keywords: asset.keywords,
      suggestedRoleCode: null,
      suggestedLibraryCode: null,
      suggestedBundleSlots: [],
      orientation: asset.orientation,
      aspectRatio: null,
      primaryColors: asset.dominantColor ? [asset.dominantColor] : [],
      suggestedProductTerms: [],
      suggestedIndustryTerms: [],
      suggestedUseCaseTerms: [],
      suggestedTechniqueTerms: [],
      suggestedMaterialTerms: [],
      suggestedSubjectTerms: [],
      suggestedSuitabilities: [],
      classifierLabels: ["unknown"],
      confidence: 0,
      source: "DETERMINISTIC",
    },
    health: bag?.health,
    processedAt: bag?.processedAt ?? new Date().toISOString(),
    reviewedAt: new Date().toISOString(),
    reviewedBy: input.reviewedBy ?? null,
  };

  const root =
    asset.metadata && typeof asset.metadata === "object" && !Array.isArray(asset.metadata)
      ? ({ ...(asset.metadata as Record<string, unknown>) } as Record<string, unknown>)
      : {};
  root[INTELLIGENT_META_KEY] = nextBag;
  data.metadata = root as Prisma.InputJsonValue;

  await prisma.mediaAsset.update({ where: { id: asset.id }, data });
  await recalculateMediaIntelligenceForIds([asset.id]);
  return { ok: true };
}

/** Bulk confirm metadata suggestions. Never bulk-publish. */
export async function bulkReviewMediaMetadata(input: {
  mediaAssetIds: string[];
  reviewedBy?: string | null;
  applySuggestions?: boolean;
}): Promise<{ reviewed: number }> {
  const ids = [...new Set(input.mediaAssetIds)].slice(0, 100);
  let reviewed = 0;
  for (const id of ids) {
    await reviewMediaAssetMetadata({
      mediaAssetId: id,
      reviewedBy: input.reviewedBy,
      applySuggestions: input.applySuggestions ?? true,
    });
    reviewed += 1;
  }
  return { reviewed };
}
