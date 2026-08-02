import { prisma } from "@/lib/prisma";
import type {
  BundleCoverageReport,
  BundleCoverageSlot,
} from "@/features/media/intelligence/intelligence.types";
import { MEDIA_BUNDLE_SLOT_TYPE_LABELS } from "@/features/media/media-bundle-presets";
import type { MediaBundleSlotType } from "@prisma/client";

/**
 * Coverage for a concrete MediaBundle (filled slots vs required).
 */
export async function assessBundleSlotCoverage(
  bundleId: string,
): Promise<BundleCoverageReport | null> {
  const bundle = await prisma.mediaBundle.findUnique({
    where: { id: bundleId },
    include: {
      slots: {
        orderBy: { sortOrder: "asc" },
        include: {
          assets: {
            include: {
              mediaAsset: { select: { id: true, visibility: true } },
            },
          },
        },
      },
    },
  });
  if (!bundle) return null;

  const slots: BundleCoverageSlot[] = bundle.slots.map((slot) => {
    const publicAssets = slot.assets.filter((row) => row.mediaAsset.visibility !== "PRIVATE");
    const filled = publicAssets.length >= Math.max(1, slot.minAssets);
    return {
      slotType: slot.slotType,
      label: slot.label || MEDIA_BUNDLE_SLOT_TYPE_LABELS[slot.slotType] || slot.slotType,
      required: slot.required,
      filled,
      assetCount: publicAssets.length,
      minAssets: slot.minAssets,
    };
  });

  const required = slots.filter((slot) => slot.required);
  const filledRequired = required.filter((slot) => slot.filled).length;
  const gaps = slots
    .filter((slot) => slot.required && !slot.filled)
    .map((slot) => slot.slotType);

  const healthScore =
    required.length === 0
      ? slots.length
        ? Math.round((slots.filter((s) => s.filled).length / slots.length) * 100)
        : 0
      : Math.round((filledRequired / required.length) * 100);

  return {
    bundleId: bundle.id,
    name: bundle.name,
    status: bundle.status,
    slots,
    filledRequired,
    totalRequired: required.length,
    gaps,
    healthScore,
  };
}

export async function listBundleCoverageGaps(limit = 20): Promise<
  Array<{ bundleId: string; name: string; gaps: string[] }>
> {
  const bundles = await prisma.mediaBundle.findMany({
    where: { isActive: true, status: { in: ["DRAFT", "READY"] } },
    select: { id: true },
    take: 80,
    orderBy: { updatedAt: "desc" },
  });

  const reports: Array<{ bundleId: string; name: string; gaps: string[] }> = [];
  for (const row of bundles) {
    const report = await assessBundleSlotCoverage(row.id);
    if (!report || !report.gaps.length) continue;
    reports.push({
      bundleId: report.bundleId,
      name: report.name,
      gaps: report.gaps,
    });
    if (reports.length >= limit) break;
  }
  return reports;
}

/** Suggest slot types for a batch of assets (editor confirms). */
export async function suggestBundleSlotsForAssets(
  mediaAssetIds: string[],
): Promise<
  Array<{
    mediaAssetId: string;
    suggestedSlots: MediaBundleSlotType[];
    labels: string[];
    confidence: number;
  }>
> {
  const { defaultMetadataProvider } = await import(
    "@/features/media/intelligence/deterministic-metadata-provider"
  );
  const assets = await prisma.mediaAsset.findMany({
    where: { id: { in: mediaAssetIds } },
    include: {
      library: { select: { code: true } },
      role: { select: { code: true } },
    },
  });

  const out = [];
  for (const asset of assets) {
    if (asset.visibility === "PRIVATE") continue;
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
      libraryCode: asset.library?.code,
      roleCode: asset.role?.code,
      width: asset.width,
      height: asset.height,
      orientation: asset.orientation,
      dominantColor: asset.dominantColor,
    });
    out.push({
      mediaAssetId: asset.id,
      suggestedSlots: suggested.suggestedBundleSlots,
      labels: suggested.classifierLabels,
      confidence: suggested.confidence,
    });
  }
  return out;
}
