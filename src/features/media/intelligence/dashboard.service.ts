import type { MediaAiProcessingStatus, MediaVisibility } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { MediaDashboardSnapshot } from "@/features/media/intelligence/intelligence.types";
import { listBundleCoverageGaps } from "@/features/media/intelligence/bundle-coverage.service";
import { getCanonicalMediaCoverage } from "@/features/media/canonical-coverage.service";

const EMPTY_AI: Record<MediaAiProcessingStatus, number> = {
  NOT_PROCESSED: 0,
  QUEUED: 0,
  PROCESSING: 0,
  COMPLETED: 0,
  FAILED: 0,
  SKIPPED: 0,
};

const EMPTY_VIS: Record<MediaVisibility, number> = {
  PUBLIC: 0,
  INTERNAL: 0,
  PRIVATE: 0,
};

export async function getMediaDashboardSnapshot(): Promise<MediaDashboardSnapshot> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    assets,
    publicAssets,
    needsReview,
    missingAlt,
    duplicates,
    unused,
    lowSeo,
    recentlyUploaded,
    aiGroups,
    visGroups,
    topUsedRaw,
    coverageGaps,
    canonical,
  ] = await Promise.all([
    prisma.mediaAsset.count(),
    prisma.mediaAsset.count({ where: { visibility: "PUBLIC" } }),
    prisma.mediaAsset.count({
      where: {
        OR: [
          { aiProcessingStatus: "COMPLETED" },
          { aiProcessingStatus: "FAILED" },
          { seoReadinessStatus: "INCOMPLETE" },
        ],
        AND: [
          {
            OR: [
              { altText: null },
              { altText: "" },
              { title: null },
              { title: "" },
              { seoReadinessStatus: { in: ["INCOMPLETE", "BASIC"] } },
            ],
          },
        ],
      },
    }),
    prisma.mediaAsset.count({
      where: { OR: [{ altText: null }, { altText: "" }] },
    }),
    prisma.mediaAsset.count({
      where: {
        duplicateStatus: { in: ["POSSIBLE_DUPLICATE", "CONFIRMED_DUPLICATE"] },
      },
    }),
    prisma.mediaAsset.count({
      where: {
        contentMediaAssignments: { none: {} },
        bundleSlotAssets: { none: {} },
      },
    }),
    prisma.mediaAsset.count({
      where: { seoScore: { lt: 50 } },
    }),
    prisma.mediaAsset.count({
      where: { createdAt: { gte: sevenDaysAgo } },
    }),
    prisma.mediaAsset.groupBy({
      by: ["aiProcessingStatus"],
      _count: { _all: true },
    }),
    prisma.mediaAsset.groupBy({
      by: ["visibility"],
      _count: { _all: true },
    }),
    prisma.contentMediaAssignment.groupBy({
      by: ["mediaAssetId"],
      _count: { _all: true },
      orderBy: { _count: { mediaAssetId: "desc" } },
      take: 10,
    }),
    listBundleCoverageGaps(8),
    getCanonicalMediaCoverage().catch(() => null),
  ]);

  const byAiStatus = { ...EMPTY_AI };
  for (const row of aiGroups) {
    byAiStatus[row.aiProcessingStatus] = row._count._all;
  }
  const byVisibility = { ...EMPTY_VIS };
  for (const row of visGroups) {
    byVisibility[row.visibility] = row._count._all;
  }

  const topIds = topUsedRaw.map((row) => row.mediaAssetId);
  const topAssets = topIds.length
    ? await prisma.mediaAsset.findMany({
        where: { id: { in: topIds } },
        select: { id: true, title: true },
      })
    : [];
  const titleById = new Map(topAssets.map((row) => [row.id, row.title]));

  return {
    totals: {
      assets,
      publicAssets,
      needsReview,
      missingAlt,
      duplicates,
      unused,
      lowSeo,
      recentlyUploaded,
    },
    byAiStatus,
    byVisibility,
    topUsed: topUsedRaw.map((row) => ({
      mediaAssetId: row.mediaAssetId,
      title: titleById.get(row.mediaAssetId) ?? null,
      uses: row._count._all,
    })),
    coverageGaps,
    canonicalCoverage: canonical
      ? {
          overallMigrationPercent: canonical.overallMigrationPercent,
          categoryPercent: canonical.category.migrationPercent,
          caseStudyPercent: canonical.caseStudy.migrationPercent,
          productPercent: canonical.product.migrationPercent,
          brokenUrlCount: canonical.brokenUrlCount,
          mediaAssetMissingCount: canonical.mediaAssetMissingCount,
          category: {
            canonical: canonical.category.canonical,
            legacyOnly: canonical.category.legacyOnly,
            withMedia: canonical.category.withMedia,
          },
          caseStudy: {
            canonical: canonical.caseStudy.canonical,
            legacyOnly: canonical.caseStudy.legacyOnly,
            withMedia: canonical.caseStudy.withMedia,
          },
          product: {
            canonical: canonical.product.canonical,
            legacyOnly: canonical.product.legacyOnly,
            withMedia: canonical.product.withMedia,
          },
        }
      : undefined,
  };
}

export type PhotographerWorkflowLane =
  | "incoming"
  | "waiting_review"
  | "needs_metadata"
  | "ready"
  | "published";

export async function countPhotographerWorkflowLanes(): Promise<
  Record<PhotographerWorkflowLane, number>
> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [incoming, waiting_review, needs_metadata, ready, published] = await Promise.all([
    prisma.mediaAsset.count({
      where: {
        createdAt: { gte: sevenDaysAgo },
        aiProcessingStatus: { in: ["QUEUED", "PROCESSING", "NOT_PROCESSED"] },
      },
    }),
    prisma.mediaAsset.count({
      where: {
        aiProcessingStatus: "COMPLETED",
        seoReadinessStatus: { in: ["INCOMPLETE", "BASIC"] },
      },
    }),
    prisma.mediaAsset.count({
      where: {
        OR: [{ altText: null }, { altText: "" }, { title: null }, { title: "" }],
      },
    }),
    prisma.mediaAsset.count({
      where: {
        visibility: { in: ["PUBLIC", "INTERNAL"] },
        seoReadinessStatus: { in: ["READY", "EXCELLENT"] },
        aiProcessingStatus: { notIn: ["QUEUED", "PROCESSING"] },
      },
    }),
    prisma.mediaAsset.count({
      where: {
        visibility: "PUBLIC",
        seoReadinessStatus: { in: ["READY", "EXCELLENT"] },
      },
    }),
  ]);
  return { incoming, waiting_review, needs_metadata, ready, published };
}
