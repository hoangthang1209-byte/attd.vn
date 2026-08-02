import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { defaultMetadataProvider } from "@/features/media/intelligence/deterministic-metadata-provider";
import { calculateAssetHealth } from "@/features/media/intelligence/asset-health.service";
import {
  INTELLIGENT_META_KEY,
  type IntelligentMediaMetaBag,
  type SuggestedMediaMetadata,
} from "@/features/media/intelligence/intelligence.types";
import { updateMediaAiProcessingStatus } from "@/features/media/services/media-intelligence.service";

/**
 * Resumable ingest pipeline:
 * UPLOAD → PROCESSING → METADATA → REVIEW
 * Never auto-publishes. Never flips visibility to PUBLIC.
 */
export async function runMediaIngestPipeline(mediaAssetId: string): Promise<{
  suggested: SuggestedMediaMetadata;
  stage: IntelligentMediaMetaBag["stage"];
}> {
  const asset = await prisma.mediaAsset.findUnique({
    where: { id: mediaAssetId },
    include: {
      library: { select: { code: true } },
      role: { select: { code: true } },
      _count: { select: { collections: true, contentMediaAssignments: true } },
    },
  });
  if (!asset) throw new Error("Không tìm thấy MediaAsset.");

  // Skip if already completed successfully unless forced by caller (idempotent).
  if (asset.aiProcessingStatus === "COMPLETED") {
    const existing = readIntelligentBag(asset.metadata);
    if (existing?.suggested) {
      return { suggested: existing.suggested, stage: existing.stage ?? "REVIEW" };
    }
  }

  // Resumable transitions: PROCESSING continues; others queue then process.
  const status = asset.aiProcessingStatus;
  if (status === "NOT_PROCESSED" || status === "FAILED" || status === "COMPLETED" || status === "SKIPPED") {
    await updateMediaAiProcessingStatus(mediaAssetId, "QUEUED");
  }
  if (status !== "PROCESSING") {
    await updateMediaAiProcessingStatus(mediaAssetId, "PROCESSING");
  }

  try {
    const suggested = await defaultMetadataProvider.suggest({
      filename: asset.filename,
      originalName: asset.originalName,
      title: asset.title,
      altText: asset.altText,
      caption: asset.caption,
      keywords: asset.keywords,
      subjectTerms: asset.subjectTerms,
      materialTerms: asset.materialTerms,
      techniqueTerms: asset.techniqueTerms,
      useCaseTerms: asset.useCaseTerms,
      industryTerms: asset.industryTerms,
      libraryCode: asset.library?.code ?? null,
      roleCode: asset.role?.code ?? null,
      width: asset.width,
      height: asset.height,
      orientation: asset.orientation,
      dominantColor: asset.dominantColor,
      mimeType: asset.mimeType,
    });

    const health = calculateAssetHealth({
      altText: asset.altText || suggested.altText,
      title: asset.title || suggested.title,
      caption: asset.caption || suggested.caption,
      keywords: asset.keywords.length ? asset.keywords : suggested.keywords,
      subjectTerms: asset.subjectTerms.length
        ? asset.subjectTerms
        : suggested.suggestedSubjectTerms,
      width: asset.width,
      height: asset.height,
      orientation: asset.orientation,
      visibility: asset.visibility,
      duplicateStatus: asset.duplicateStatus,
      duplicateOfId: asset.duplicateOfId,
      contentSuitabilities: asset.contentSuitabilities,
      seoScore: asset.seoScore,
      bundleCount: 0,
      usageCount: asset._count.contentMediaAssignments,
      libraryId: asset.libraryId,
      roleId: asset.roleId,
    });

    const bag: IntelligentMediaMetaBag = {
      stage: "REVIEW",
      suggested,
      health,
      processedAt: new Date().toISOString(),
      reviewedAt: null,
      reviewedBy: null,
    };

    const root =
      asset.metadata && typeof asset.metadata === "object" && !Array.isArray(asset.metadata)
        ? ({ ...(asset.metadata as Record<string, unknown>) } as Record<string, unknown>)
        : {};
    root[INTELLIGENT_META_KEY] = bag;

    // Soft-fill only empty editorial fields — never overwrite editor values.
    await prisma.mediaAsset.update({
      where: { id: mediaAssetId },
      data: {
        metadata: root as Prisma.InputJsonValue,
        title: asset.title?.trim() ? undefined : suggested.title,
        altText: asset.altText?.trim() ? undefined : suggested.altText,
        caption: asset.caption?.trim() ? undefined : suggested.caption,
        keywords: asset.keywords.length ? undefined : suggested.keywords,
        subjectTerms: asset.subjectTerms.length
          ? undefined
          : suggested.suggestedSubjectTerms,
        materialTerms: asset.materialTerms.length
          ? undefined
          : suggested.suggestedMaterialTerms,
        techniqueTerms: asset.techniqueTerms.length
          ? undefined
          : suggested.suggestedTechniqueTerms,
        industryTerms: asset.industryTerms.length
          ? undefined
          : suggested.suggestedIndustryTerms,
        useCaseTerms: asset.useCaseTerms.length
          ? undefined
          : suggested.suggestedUseCaseTerms,
        contentSuitabilities: asset.contentSuitabilities.length
          ? undefined
          : suggested.suggestedSuitabilities,
        // Do not change visibility.
      },
    });

    await updateMediaAiProcessingStatus(mediaAssetId, "COMPLETED");
    return { suggested, stage: "REVIEW" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ingest failed";
    await prisma.mediaAsset.update({
      where: { id: mediaAssetId },
      data: {
        aiProcessingStatus: "FAILED",
        aiProcessingError: message.slice(0, 500),
        aiProcessedAt: new Date(),
      },
    });
    throw error;
  }
}

export function readIntelligentBag(
  metadata: Prisma.JsonValue | null | undefined,
): IntelligentMediaMetaBag | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const bag = (metadata as Record<string, unknown>)[INTELLIGENT_META_KEY];
  if (!bag || typeof bag !== "object") return null;
  return bag as IntelligentMediaMetaBag;
}

/** Exclude incomplete ingest assets from public suggestion surfaces. */
export function isAssetReadyForSuggestion(status: string, visibility: string): boolean {
  if (visibility === "PRIVATE") return false;
  if (status === "QUEUED" || status === "PROCESSING") return false;
  return true;
}
