import type { MediaLifecycleStatus, MediaRightsStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  MEDIA_LIFECYCLE_BULK_MAX,
  MediaLifecycleError,
  type LifecycleDashboardCounts,
  type LifecycleQueueView,
} from "@/features/media/lifecycle/lifecycle.types";
import {
  setMediaAssetRights,
  transitionMediaLifecycle,
} from "@/features/media/lifecycle/lifecycle-transition.service";
import { writeLifecycleEvent } from "@/features/media/lifecycle/lifecycle-transition.service";

function queueWhere(view: LifecycleQueueView): Prisma.MediaAssetWhereInput {
  const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const now = new Date();
  switch (view) {
    case "needs_review":
      return {
        OR: [
          { lifecycleStatus: "REVIEW_REQUIRED" },
          { nextLifecycleReviewAt: { lte: now } },
        ],
      };
    case "deprecated":
      return { lifecycleStatus: "DEPRECATED" };
    case "archived":
      return { lifecycleStatus: "ARCHIVED" };
    case "retired":
      return { lifecycleStatus: "RETIRED" };
    case "replacement_pending":
      return {
        replacementAssetId: { not: null },
        lifecycleStatus: { in: ["DEPRECATED", "RETIRED", "REVIEW_REQUIRED"] },
      };
    case "rights_expiring":
      return {
        rightsStatus: "LICENSED",
        rightsExpiresAt: { gt: now, lte: in30Days },
      };
    case "rights_expired":
      return {
        rightsStatus: "LICENSED",
        rightsExpiresAt: { lt: now },
      };
    case "unknown_rights_public":
      return {
        visibility: "PUBLIC",
        rightsStatus: "UNKNOWN",
        lifecycleStatus: { in: ["ACTIVE", "REVIEW_REQUIRED"] },
      };
    case "unsupported_legacy":
      // Heuristic queue — editors review Category/CaseStudy URL hits via dependency detail
      return {
        lifecycleStatus: "ACTIVE",
        visibility: "PUBLIC",
        rightsStatus: "UNKNOWN",
      };
    default:
      return {};
  }
}

export async function listLifecycleQueue(input: {
  view: LifecycleQueueView;
  limit?: number;
  cursor?: string;
}) {
  const limit = Math.min(Math.max(input.limit ?? 40, 1), 100);
  const items = await prisma.mediaAsset.findMany({
    where: queueWhere(input.view),
    select: {
      id: true,
      title: true,
      altText: true,
      url: true,
      thumbnailUrl: true,
      visibility: true,
      lifecycleStatus: true,
      rightsStatus: true,
      rightsExpiresAt: true,
      replacementAssetId: true,
      lifecycleReason: true,
      lastLifecycleReviewAt: true,
      nextLifecycleReviewAt: true,
      createdAt: true,
      _count: {
        select: {
          contentMediaAssignments: true,
          bundleSlotAssets: true,
        },
      },
    },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
  });

  const hasMore = items.length > limit;
  const page = hasMore ? items.slice(0, limit) : items;
  return {
    view: input.view,
    items: page,
    nextCursor: hasMore ? page[page.length - 1]?.id ?? null : null,
  };
}

export async function getLifecycleDashboardCounts(): Promise<LifecycleDashboardCounts> {
  const now = new Date();
  const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const [
    active,
    reviewRequired,
    deprecated,
    archived,
    retired,
    replacementPending,
    rightsExpiring,
    rightsExpired,
    unknownRightsPublic,
    unused,
  ] = await Promise.all([
    prisma.mediaAsset.count({ where: { lifecycleStatus: "ACTIVE" } }),
    prisma.mediaAsset.count({ where: { lifecycleStatus: "REVIEW_REQUIRED" } }),
    prisma.mediaAsset.count({ where: { lifecycleStatus: "DEPRECATED" } }),
    prisma.mediaAsset.count({ where: { lifecycleStatus: "ARCHIVED" } }),
    prisma.mediaAsset.count({ where: { lifecycleStatus: "RETIRED" } }),
    prisma.mediaAsset.count({
      where: {
        replacementAssetId: { not: null },
        lifecycleStatus: { in: ["DEPRECATED", "RETIRED", "REVIEW_REQUIRED"] },
      },
    }),
    prisma.mediaAsset.count({
      where: {
        rightsStatus: "LICENSED",
        rightsExpiresAt: { gt: now, lte: in30Days },
      },
    }),
    prisma.mediaAsset.count({
      where: { rightsStatus: "LICENSED", rightsExpiresAt: { lt: now } },
    }),
    prisma.mediaAsset.count({
      where: {
        visibility: "PUBLIC",
        rightsStatus: "UNKNOWN",
        lifecycleStatus: { in: ["ACTIVE", "REVIEW_REQUIRED"] },
      },
    }),
    prisma.mediaAsset.count({
      where: {
        contentMediaAssignments: { none: {} },
        bundleSlotAssets: { none: {} },
        lifecycleStatus: { in: ["ACTIVE", "REVIEW_REQUIRED"] },
      },
    }),
  ]);

  return {
    active,
    reviewRequired,
    deprecated,
    archived,
    retired,
    replacementPending,
    rightsExpiring,
    rightsExpired,
    unknownRightsPublic,
    unused,
  };
}

export type BulkLifecycleAction =
  | "MARK_REVIEW_REQUIRED"
  | "DEPRECATE"
  | "ARCHIVE"
  | "RESTORE"
  | "SET_REVIEW_DATE"
  | "SET_RIGHTS";

export async function bulkLifecycleUpdate(input: {
  mediaAssetIds: string[];
  action: BulkLifecycleAction;
  actorId?: string | null;
  reason?: string | null;
  nextLifecycleReviewAt?: Date | null;
  rightsStatus?: MediaRightsStatus;
  rightsExpiresAt?: Date | null;
}) {
  const ids = [...new Set(input.mediaAssetIds.map((id) => id.trim()).filter(Boolean))];
  if (!ids.length) {
    throw new MediaLifecycleError("ASSET_NOT_FOUND", "Danh sách asset trống");
  }
  if (ids.length > MEDIA_LIFECYCLE_BULK_MAX) {
    throw new MediaLifecycleError(
      "BATCH_TOO_LARGE",
      `Tối đa ${MEDIA_LIFECYCLE_BULK_MAX} ảnh mỗi lần`,
    );
  }

  // Never bulk-retire or bulk-replace
  if ((input.action as string) === "RETIRE" || (input.action as string) === "REPLACE") {
    throw new MediaLifecycleError(
      "INVALID_LIFECYCLE_TRANSITION",
      "Không hỗ trợ bulk retire / replace",
    );
  }

  let updated = 0;
  const errors: Array<{ id: string; message: string }> = [];

  for (const id of ids) {
    try {
      switch (input.action) {
        case "MARK_REVIEW_REQUIRED":
          await transitionMediaLifecycle({
            mediaAssetId: id,
            toStatus: "REVIEW_REQUIRED",
            actorId: input.actorId,
            reason: input.reason || "Bulk mark review required",
          });
          break;
        case "DEPRECATE":
          await transitionMediaLifecycle({
            mediaAssetId: id,
            toStatus: "DEPRECATED",
            actorId: input.actorId,
            reason: input.reason,
          });
          break;
        case "ARCHIVE":
          await transitionMediaLifecycle({
            mediaAssetId: id,
            toStatus: "ARCHIVED",
            actorId: input.actorId,
            reason: input.reason,
          });
          break;
        case "RESTORE":
          await transitionMediaLifecycle({
            mediaAssetId: id,
            toStatus: "ACTIVE",
            actorId: input.actorId,
            reason: input.reason || "Bulk restore",
          });
          break;
        case "SET_REVIEW_DATE":
          await prisma.mediaAsset.update({
            where: { id },
            data: {
              nextLifecycleReviewAt: input.nextLifecycleReviewAt ?? null,
              lastLifecycleReviewAt: new Date(),
            },
          });
          await writeLifecycleEvent({
            mediaAssetId: id,
            action: "SET_REVIEW_DATES",
            actorId: input.actorId,
            reason: input.reason,
            metadata: {
              nextLifecycleReviewAt: input.nextLifecycleReviewAt?.toISOString() ?? null,
            },
          });
          break;
        case "SET_RIGHTS":
          await setMediaAssetRights({
            mediaAssetId: id,
            actorId: input.actorId,
            reason: input.reason,
            patch: {
              rightsStatus: input.rightsStatus,
              rightsExpiresAt: input.rightsExpiresAt,
            },
          });
          break;
      }
      updated += 1;
    } catch (err) {
      errors.push({
        id,
        message: err instanceof Error ? err.message : "failed",
      });
    }
  }

  return { updated, failed: errors.length, errors };
}

export type UnusedAssetState =
  | "NEW_UNUSED"
  | "AVAILABLE_UNUSED"
  | "STALE_UNUSED"
  | "ARCHIVED_UNUSED";

export function classifyUnusedAsset(input: {
  createdAt: Date;
  lifecycleStatus: MediaLifecycleStatus;
  referenceCount: number;
}): UnusedAssetState | null {
  if (input.referenceCount > 0) return null;
  if (input.lifecycleStatus === "ARCHIVED") return "ARCHIVED_UNUSED";
  const ageDays = (Date.now() - input.createdAt.getTime()) / (24 * 60 * 60 * 1000);
  if (ageDays < 7) return "NEW_UNUSED";
  if (ageDays < 90) return "AVAILABLE_UNUSED";
  return "STALE_UNUSED";
}
