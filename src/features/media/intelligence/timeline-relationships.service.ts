import { prisma } from "@/lib/prisma";
import type {
  MediaRelationshipMap,
  MediaTimelineEvent,
} from "@/features/media/intelligence/intelligence.types";
import { readIntelligentBag } from "@/features/media/intelligence/ingest-pipeline.service";
import { resolveMediaReferences } from "@/features/media/services/media-reference.service";

export async function getMediaAssetTimeline(
  mediaAssetId: string,
): Promise<MediaTimelineEvent[]> {
  const asset = await prisma.mediaAsset.findUnique({
    where: { id: mediaAssetId },
    include: {
      bundleSlotAssets: {
        include: {
          mediaBundleSlot: {
            include: { mediaBundle: { select: { id: true, name: true } } },
          },
        },
        take: 20,
      },
      contentMediaAssignments: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });
  if (!asset) return [];

  const events: MediaTimelineEvent[] = [];
  events.push({
    at: asset.createdAt.toISOString(),
    type: "UPLOADED",
    summary: `Uploaded ${asset.originalName || asset.filename}`,
  });

  const intelligent = readIntelligentBag(asset.metadata);
  if (intelligent?.processedAt) {
    events.push({
      at: intelligent.processedAt,
      type: "METADATA",
      summary: "Auto metadata generated (deterministic)",
      meta: {
        confidence: intelligent.suggested.confidence,
        source: intelligent.suggested.source,
      },
    });
  } else if (asset.aiProcessedAt) {
    events.push({
      at: asset.aiProcessedAt.toISOString(),
      type: "METADATA",
      summary: `AI status: ${asset.aiProcessingStatus}`,
    });
  }

  if (intelligent?.reviewedAt) {
    events.push({
      at: intelligent.reviewedAt,
      type: "REVIEWED",
      summary: "Metadata reviewed by editor",
      meta: { reviewedBy: intelligent.reviewedBy ?? null },
    });
  }

  for (const join of asset.bundleSlotAssets) {
    events.push({
      at: join.createdAt.toISOString(),
      type: "BUNDLE",
      summary: `Added to bundle ${join.mediaBundleSlot.mediaBundle.name}`,
      meta: {
        bundleId: join.mediaBundleSlot.mediaBundle.id,
        slotType: join.mediaBundleSlot.slotType,
      },
    });
  }

  for (const assignment of asset.contentMediaAssignments) {
    events.push({
      at: assignment.createdAt.toISOString(),
      type: "USED",
      summary: `Assigned to ${assignment.entityType} (${assignment.placement})`,
      meta: {
        entityType: assignment.entityType,
        entityId: assignment.entityId,
        placement: assignment.placement,
      },
    });
  }

  events.push({
    at: asset.updatedAt.toISOString(),
    type: "STATUS",
    summary: `Visibility ${asset.visibility} · SEO ${asset.seoReadinessStatus}`,
  });

  return events.sort((a, b) => a.at.localeCompare(b.at));
}

export async function getMediaAssetRelationships(
  mediaAssetId: string,
): Promise<MediaRelationshipMap> {
  const [assignments, bundleJoins, refs] = await Promise.all([
    prisma.contentMediaAssignment.findMany({
      where: { mediaAssetId },
      select: { entityType: true, entityId: true, placement: true },
    }),
    prisma.mediaBundleSlotAsset.findMany({
      where: { mediaAssetId },
      include: {
        mediaBundleSlot: {
          select: {
            slotType: true,
            mediaBundle: { select: { id: true, name: true } },
          },
        },
      },
    }),
    resolveMediaReferences(mediaAssetId),
  ]);

  const blogIds = [
    ...new Set(
      refs.filter((ref) => ref.type === "BLOG").map((ref) => ref.entityId),
    ),
  ];
  const blogPosts = blogIds.length
    ? await prisma.blogPost.findMany({
        where: { id: { in: blogIds } },
        select: { id: true, title: true, slug: true, status: true },
      })
    : [];

  return {
    mediaAssetId,
    assignments: assignments.map((row) => ({
      entityType: row.entityType,
      entityId: row.entityId,
      placement: row.placement,
    })),
    bundles: bundleJoins.map((join) => ({
      bundleId: join.mediaBundleSlot.mediaBundle.id,
      name: join.mediaBundleSlot.mediaBundle.name,
      slotType: join.mediaBundleSlot.slotType,
    })),
    blogPosts,
  };
}
