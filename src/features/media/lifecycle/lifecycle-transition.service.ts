import type {
  MediaLifecycleAction,
  MediaLifecycleStatus,
  Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  LIFECYCLE_ACTION_FOR_STATUS,
  LIFECYCLE_ALLOWED_TRANSITIONS,
  MediaLifecycleError,
  type LifecycleTransitionInput,
  type MediaRightsPatch,
} from "@/features/media/lifecycle/lifecycle.types";
import { resolveMediaDependencies } from "@/features/media/lifecycle/media-dependency.service";

export async function assertLifecycleTransition(
  from: MediaLifecycleStatus,
  to: MediaLifecycleStatus,
): Promise<void> {
  if (from === to) return;
  if (!LIFECYCLE_ALLOWED_TRANSITIONS[from].includes(to)) {
    throw new MediaLifecycleError(
      "INVALID_LIFECYCLE_TRANSITION",
      `Không thể chuyển lifecycle từ ${from} sang ${to}`,
      { from, to },
    );
  }
}

export async function writeLifecycleEvent(input: {
  mediaAssetId: string;
  action: MediaLifecycleAction;
  fromStatus?: MediaLifecycleStatus | null;
  toStatus?: MediaLifecycleStatus | null;
  actorId?: string | null;
  reason?: string | null;
  replacementAssetId?: string | null;
  metadata?: Record<string, unknown> | null;
}) {
  return prisma.mediaAssetLifecycleEvent.create({
    data: {
      mediaAssetId: input.mediaAssetId,
      action: input.action,
      fromStatus: input.fromStatus ?? null,
      toStatus: input.toStatus ?? null,
      actorId: input.actorId ?? null,
      reason: input.reason?.trim() || null,
      replacementAssetId: input.replacementAssetId ?? null,
      metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
}

function requireReason(reason: string | null | undefined, action: string) {
  if (!reason?.trim()) {
    throw new MediaLifecycleError(
      "REASON_REQUIRED",
      `Cần ghi lý do khi ${action}`,
    );
  }
}

/**
 * Governed lifecycle transition. Never mutates URL/storage/publicId.
 * Never removes consumer references.
 */
export async function transitionMediaLifecycle(
  input: LifecycleTransitionInput,
) {
  const asset = await prisma.mediaAsset.findUnique({
    where: { id: input.mediaAssetId },
    select: {
      id: true,
      lifecycleStatus: true,
      url: true,
      storageKey: true,
      publicId: true,
      visibility: true,
      replacementAssetId: true,
    },
  });
  if (!asset) {
    throw new MediaLifecycleError("ASSET_NOT_FOUND", "Không tìm thấy MediaAsset");
  }

  await assertLifecycleTransition(asset.lifecycleStatus, input.toStatus);

  const needsReason =
    input.toStatus === "DEPRECATED" ||
    input.toStatus === "ARCHIVED" ||
    input.toStatus === "RETIRED" ||
    (asset.lifecycleStatus === "RETIRED" && input.toStatus === "ACTIVE");
  if (needsReason) {
    requireReason(input.reason, input.toStatus.toLowerCase());
  }

  const deps = await resolveMediaDependencies(asset.id);
  if (
    input.toStatus === "RETIRED" &&
    deps.publicCount > 0 &&
    !input.replacementAssetId &&
    !asset.replacementAssetId &&
    !input.allowPublicWithoutReplacement
  ) {
    throw new MediaLifecycleError(
      "ASSET_HAS_PUBLIC_REFERENCES",
      `Ảnh đang dùng tại ${deps.publicCount} vị trí công khai. Chọn replacement hoặc xác nhận kế hoạch thay thế trước khi retire.`,
      { publicCount: deps.publicCount, total: deps.total },
    );
  }

  if (input.replacementAssetId) {
    await assertValidReplacementTarget(asset.id, input.replacementAssetId);
  }

  const now = new Date();
  const data: Prisma.MediaAssetUpdateInput = {
    lifecycleStatus: input.toStatus,
    lifecycleReason: input.reason?.trim() || null,
    lastLifecycleReviewAt: now,
  };

  if (input.toStatus === "DEPRECATED") {
    data.deprecatedAt = now;
    data.deprecatedBy = input.actorId ?? null;
  }
  if (input.toStatus === "ARCHIVED") {
    data.archivedAt = now;
    data.archivedBy = input.actorId ?? null;
  }
  if (input.toStatus === "RETIRED") {
    data.retiredAt = now;
    data.retiredBy = input.actorId ?? null;
  }
  if (input.toStatus === "ACTIVE") {
    data.deprecatedAt = null;
    data.deprecatedBy = null;
    data.archivedAt = null;
    data.archivedBy = null;
    data.retiredAt = null;
    data.retiredBy = null;
  }
  if (input.replacementAssetId) {
    data.replacementAsset = { connect: { id: input.replacementAssetId } };
  }

  // Guard: never touch storage fields
  const updated = await prisma.mediaAsset.update({
    where: { id: asset.id },
    data,
  });

  if (
    updated.url !== asset.url ||
    updated.storageKey !== asset.storageKey ||
    updated.publicId !== asset.publicId
  ) {
    // Restore if somehow mutated (should be impossible)
    await prisma.mediaAsset.update({
      where: { id: asset.id },
      data: {
        url: asset.url,
        storageKey: asset.storageKey,
        publicId: asset.publicId,
      },
    });
  }

  const action =
    LIFECYCLE_ACTION_FOR_STATUS[input.toStatus] ?? ("BULK_UPDATE" as MediaLifecycleAction);

  await writeLifecycleEvent({
    mediaAssetId: asset.id,
    action,
    fromStatus: asset.lifecycleStatus,
    toStatus: input.toStatus,
    actorId: input.actorId,
    reason: input.reason,
    replacementAssetId: input.replacementAssetId ?? asset.replacementAssetId,
    metadata: {
      referenceTotal: deps.total,
      publicCount: deps.publicCount,
      blockingCount: deps.blockingCount,
    },
  });

  return {
    asset: updated,
    references: deps,
  };
}

export async function assertValidReplacementTarget(
  sourceAssetId: string,
  replacementAssetId: string,
) {
  if (sourceAssetId === replacementAssetId) {
    throw new MediaLifecycleError(
      "REPLACEMENT_INVALID",
      "Replacement không thể là chính asset hiện tại",
    );
  }

  const replacement = await prisma.mediaAsset.findUnique({
    where: { id: replacementAssetId },
    select: {
      id: true,
      lifecycleStatus: true,
      visibility: true,
      replacementAssetId: true,
      duplicateOfId: true,
    },
  });
  if (!replacement) {
    throw new MediaLifecycleError("REPLACEMENT_INVALID", "Không tìm thấy replacement asset");
  }
  if (replacement.lifecycleStatus !== "ACTIVE") {
    throw new MediaLifecycleError(
      "REPLACEMENT_INVALID",
      "Replacement phải ở trạng thái ACTIVE",
      { lifecycleStatus: replacement.lifecycleStatus },
    );
  }

  // Cycle detection (bounded)
  let cursor: string | null = replacement.replacementAssetId;
  let depth = 0;
  while (cursor && depth < 8) {
    if (cursor === sourceAssetId) {
      throw new MediaLifecycleError(
        "REPLACEMENT_CYCLE",
        "Phát hiện vòng replacement",
      );
    }
    const next = await prisma.mediaAsset.findUnique({
      where: { id: cursor },
      select: { replacementAssetId: true },
    });
    cursor = next?.replacementAssetId ?? null;
    depth += 1;
  }
  if (depth >= 8 && cursor) {
    throw new MediaLifecycleError(
      "REPLACEMENT_CYCLE",
      "Chuỗi replacement vượt độ sâu cho phép",
    );
  }

  return replacement;
}

export async function selectReplacementAsset(input: {
  mediaAssetId: string;
  replacementAssetId: string | null;
  actorId?: string | null;
  reason?: string | null;
}) {
  const asset = await prisma.mediaAsset.findUnique({
    where: { id: input.mediaAssetId },
    select: { id: true, lifecycleStatus: true, replacementAssetId: true },
  });
  if (!asset) {
    throw new MediaLifecycleError("ASSET_NOT_FOUND", "Không tìm thấy MediaAsset");
  }

  if (input.replacementAssetId) {
    await assertValidReplacementTarget(asset.id, input.replacementAssetId);
  }

  const updated = await prisma.mediaAsset.update({
    where: { id: asset.id },
    data: {
      replacementAssetId: input.replacementAssetId,
      lastLifecycleReviewAt: new Date(),
    },
  });

  await writeLifecycleEvent({
    mediaAssetId: asset.id,
    action: input.replacementAssetId ? "SELECT_REPLACEMENT" : "CLEAR_REPLACEMENT",
    fromStatus: asset.lifecycleStatus,
    toStatus: asset.lifecycleStatus,
    actorId: input.actorId,
    reason: input.reason,
    replacementAssetId: input.replacementAssetId,
  });

  return updated;
}

export async function setMediaAssetRights(input: {
  mediaAssetId: string;
  patch: MediaRightsPatch;
  actorId?: string | null;
  reason?: string | null;
}) {
  const asset = await prisma.mediaAsset.findUnique({
    where: { id: input.mediaAssetId },
    select: { id: true, lifecycleStatus: true, rightsStatus: true, rightsExpiresAt: true },
  });
  if (!asset) {
    throw new MediaLifecycleError("ASSET_NOT_FOUND", "Không tìm thấy MediaAsset");
  }

  const updated = await prisma.mediaAsset.update({
    where: { id: asset.id },
    data: {
      ...(input.patch.rightsStatus !== undefined
        ? { rightsStatus: input.patch.rightsStatus }
        : {}),
      ...(input.patch.rightsExpiresAt !== undefined
        ? { rightsExpiresAt: input.patch.rightsExpiresAt }
        : {}),
      ...(input.patch.rightsOwner !== undefined
        ? { rightsOwner: input.patch.rightsOwner }
        : {}),
      ...(input.patch.rightsNotes !== undefined
        ? { rightsNotes: input.patch.rightsNotes }
        : {}),
      ...(input.patch.usageRestriction !== undefined
        ? { usageRestriction: input.patch.usageRestriction }
        : {}),
      lastLifecycleReviewAt: new Date(),
    },
  });

  // Expired licensed → REVIEW_REQUIRED (not auto-removed)
  const expiresAt = updated.rightsExpiresAt;
  if (
    updated.rightsStatus === "LICENSED" &&
    expiresAt &&
    expiresAt.getTime() < Date.now() &&
    updated.lifecycleStatus === "ACTIVE"
  ) {
    return transitionMediaLifecycle({
      mediaAssetId: asset.id,
      toStatus: "REVIEW_REQUIRED",
      actorId: input.actorId,
      reason: input.reason || "Rights expired — needs editorial review",
    });
  }

  await writeLifecycleEvent({
    mediaAssetId: asset.id,
    action: "SET_RIGHTS",
    fromStatus: asset.lifecycleStatus,
    toStatus: updated.lifecycleStatus,
    actorId: input.actorId,
    reason: input.reason,
    metadata: {
      previousRights: asset.rightsStatus,
      nextRights: updated.rightsStatus,
    },
  });

  return { asset: updated };
}

export async function setSupersedesRelation(input: {
  mediaAssetId: string;
  supersedesAssetId: string | null;
  actorId?: string | null;
  reason?: string | null;
}) {
  const asset = await prisma.mediaAsset.findUnique({
    where: { id: input.mediaAssetId },
    select: { id: true, lifecycleStatus: true },
  });
  if (!asset) {
    throw new MediaLifecycleError("ASSET_NOT_FOUND", "Không tìm thấy MediaAsset");
  }
  if (input.supersedesAssetId === asset.id) {
    throw new MediaLifecycleError(
      "REPLACEMENT_INVALID",
      "Asset không thể supersede chính nó",
    );
  }
  if (input.supersedesAssetId) {
    const parent = await prisma.mediaAsset.findUnique({
      where: { id: input.supersedesAssetId },
      select: { id: true },
    });
    if (!parent) {
      throw new MediaLifecycleError("REPLACEMENT_INVALID", "Không tìm thấy asset gốc");
    }
  }

  const updated = await prisma.mediaAsset.update({
    where: { id: asset.id },
    data: { supersedesAssetId: input.supersedesAssetId },
  });

  await writeLifecycleEvent({
    mediaAssetId: asset.id,
    action: "SET_SUPERSEDES",
    fromStatus: asset.lifecycleStatus,
    toStatus: asset.lifecycleStatus,
    actorId: input.actorId,
    reason: input.reason,
    metadata: { supersedesAssetId: input.supersedesAssetId },
  });

  return updated;
}
