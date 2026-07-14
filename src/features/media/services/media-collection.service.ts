import { prisma } from "@/lib/prisma";
import { normalizeMasterDataCode } from "@/features/media/media-classification";
import {
  validateMediaCollectionType,
  type CreateMediaCollectionInput,
  type MediaCollectionRecord,
  type UpdateMediaCollectionInput,
} from "@/features/media/media-collection.types";
import type { MediaCollectionType } from "@prisma/client";

function mapCollection(row: {
  id: string;
  code: string | null;
  name: string;
  description: string | null;
  color: string | null;
  collectionType: MediaCollectionType;
  sortOrder: number;
  isActive: boolean;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count?: { assets: number };
}): MediaCollectionRecord {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    color: row.color,
    collectionType: row.collectionType,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
    isSystem: row.isSystem,
    assetCount: row._count?.assets,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listMediaCollections(options?: {
  activeOnly?: boolean;
  includeCounts?: boolean;
  search?: string;
  collectionType?: MediaCollectionType;
}): Promise<MediaCollectionRecord[]> {
  const search = options?.search?.trim();
  const rows = await prisma.mediaCollection.findMany({
    where: {
      ...(options?.activeOnly ? { isActive: true } : {}),
      ...(options?.collectionType ? { collectionType: options.collectionType } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { code: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: options?.includeCounts ? { _count: { select: { assets: true } } } : undefined,
  });
  return rows.map(mapCollection);
}

export async function getMediaCollectionById(id: string): Promise<MediaCollectionRecord | null> {
  const row = await prisma.mediaCollection.findUnique({
    where: { id },
    include: { _count: { select: { assets: true } } },
  });
  return row ? mapCollection(row) : null;
}

export async function createMediaCollection(
  input: CreateMediaCollectionInput,
): Promise<MediaCollectionRecord> {
  const name = input.name.trim();
  if (!name) throw new Error("Tên bộ sưu tập là bắt buộc.");

  let code: string | null = null;
  if (input.code != null && String(input.code).trim()) {
    code = normalizeMasterDataCode(String(input.code));
    if (!code) throw new Error("Mã bộ sưu tập không hợp lệ.");
    const duplicate = await prisma.mediaCollection.findUnique({ where: { code } });
    if (duplicate) throw new Error("Mã bộ sưu tập đã tồn tại.");
  }

  if (input.sortOrder !== undefined && !Number.isFinite(input.sortOrder)) {
    throw new Error("Thứ tự sắp xếp không hợp lệ.");
  }

  let collectionType = input.collectionType ?? "OTHER";
  if (input.collectionType !== undefined) {
    const validated = validateMediaCollectionType(input.collectionType);
    if (!validated) throw new Error("Loại bộ sưu tập không hợp lệ.");
    collectionType = validated;
  }

  const row = await prisma.mediaCollection.create({
    data: {
      code,
      name,
      description: input.description?.trim() || null,
      color: input.color?.trim() || null,
      collectionType,
      sortOrder: input.sortOrder ?? 0,
      isActive: input.isActive ?? true,
      isSystem: false,
    },
  });
  return mapCollection(row);
}

export async function updateMediaCollection(
  id: string,
  input: UpdateMediaCollectionInput,
): Promise<MediaCollectionRecord> {
  const existing = await prisma.mediaCollection.findUnique({ where: { id } });
  if (!existing) throw new Error("Không tìm thấy bộ sưu tập.");

  const data: {
    name?: string;
    description?: string | null;
    color?: string | null;
    collectionType?: MediaCollectionType;
    sortOrder?: number;
    isActive?: boolean;
  } = {};

  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) throw new Error("Tên bộ sưu tập là bắt buộc.");
    data.name = name;
  }
  if (input.description !== undefined) data.description = input.description?.trim() || null;
  if (input.color !== undefined) data.color = input.color?.trim() || null;
  if (input.collectionType !== undefined) {
    const validated = validateMediaCollectionType(input.collectionType);
    if (!validated) throw new Error("Loại bộ sưu tập không hợp lệ.");
    data.collectionType = validated;
  }
  if (input.sortOrder !== undefined) {
    if (!Number.isFinite(input.sortOrder)) throw new Error("Thứ tự sắp xếp không hợp lệ.");
    data.sortOrder = input.sortOrder;
  }
  if (input.isActive !== undefined) {
    if (typeof input.isActive !== "boolean") throw new Error("Trạng thái kích hoạt không hợp lệ.");
    data.isActive = input.isActive;
  }

  const row = await prisma.mediaCollection.update({ where: { id }, data });
  return mapCollection(row);
}

export async function deleteMediaCollection(id: string): Promise<void> {
  const existing = await prisma.mediaCollection.findUnique({ where: { id } });
  if (!existing) throw new Error("Không tìm thấy bộ sưu tập.");
  if (existing.isSystem) throw new Error("Không thể xóa bộ sưu tập hệ thống.");

  // Cascade deletes join rows only — MediaAsset rows and files remain.
  await prisma.mediaCollection.delete({ where: { id } });
}

export async function assertCollectionsForAssignment(
  collectionIds: string[],
  options?: { requireActive?: boolean },
): Promise<string[]> {
  const uniqueIds = [...new Set(collectionIds.filter(Boolean))];
  if (!uniqueIds.length) return [];

  const rows = await prisma.mediaCollection.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true, isActive: true },
  });
  if (rows.length !== uniqueIds.length) {
    throw new Error("Một hoặc nhiều bộ sưu tập không tồn tại.");
  }
  if (options?.requireActive !== false) {
    const inactive = rows.filter((row) => !row.isActive);
    if (inactive.length) {
      throw new Error("Không thể gán bộ sưu tập đã bị vô hiệu hóa.");
    }
  }
  return uniqueIds;
}

/**
 * Idempotent add/remove collection joins for many assets.
 * Does not touch URL/storage fields or replace other collection memberships.
 */
export async function bulkAssignMediaCollections(input: {
  assetIds: string[];
  addCollectionIds?: string[];
  removeCollectionIds?: string[];
}): Promise<{ updatedAssetCount: number; addedCount: number; removedCount: number }> {
  const assetIds = [...new Set(input.assetIds.filter(Boolean))];
  if (!assetIds.length) throw new Error("Danh sách ảnh không hợp lệ.");
  if (assetIds.length > 100) throw new Error("Chỉ có thể cập nhật tối đa 100 ảnh mỗi lần.");

  const addIds = await assertCollectionsForAssignment(input.addCollectionIds ?? [], {
    requireActive: true,
  });
  const removeIds = [...new Set((input.removeCollectionIds ?? []).filter(Boolean))];
  if (removeIds.length) {
    const existing = await prisma.mediaCollection.findMany({
      where: { id: { in: removeIds } },
      select: { id: true },
    });
    if (existing.length !== removeIds.length) {
      throw new Error("Một hoặc nhiều bộ sưu tập không tồn tại.");
    }
  }

  if (!addIds.length && !removeIds.length) {
    throw new Error("Cần chọn ít nhất một bộ sưu tập để thêm hoặc gỡ.");
  }

  const existingAssets = await prisma.mediaAsset.count({ where: { id: { in: assetIds } } });
  if (existingAssets === 0) throw new Error("Không tìm thấy ảnh nào.");

  return prisma.$transaction(async (tx) => {
    let addedCount = 0;
    let removedCount = 0;

    if (addIds.length) {
      const rows = assetIds.flatMap((mediaAssetId) =>
        addIds.map((mediaCollectionId) => ({ mediaAssetId, mediaCollectionId })),
      );
      const result = await tx.mediaAssetCollection.createMany({
        data: rows,
        skipDuplicates: true,
      });
      addedCount = result.count;
    }

    if (removeIds.length) {
      const result = await tx.mediaAssetCollection.deleteMany({
        where: {
          mediaAssetId: { in: assetIds },
          mediaCollectionId: { in: removeIds },
        },
      });
      removedCount = result.count;
    }

    return {
      updatedAssetCount: existingAssets,
      addedCount,
      removedCount,
    };
  });
}

/**
 * Replace the full collection set for one asset.
 * Inactive collections may only be retained if already previously assigned.
 */
export async function setMediaAssetCollections(
  assetId: string,
  collectionIds: string[],
): Promise<void> {
  const uniqueIds = [...new Set(collectionIds.filter(Boolean))];

  const previouslyAssigned = new Set(
    (
      await prisma.mediaAssetCollection.findMany({
        where: { mediaAssetId: assetId },
        select: { mediaCollectionId: true },
      })
    ).map((row) => row.mediaCollectionId),
  );

  if (uniqueIds.length) {
    const collections = await prisma.mediaCollection.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true, isActive: true },
    });
    if (collections.length !== uniqueIds.length) {
      throw new Error("Một hoặc nhiều bộ sưu tập không tồn tại.");
    }
    for (const collection of collections) {
      if (!collection.isActive && !previouslyAssigned.has(collection.id)) {
        throw new Error("Không thể gán bộ sưu tập đã bị vô hiệu hóa.");
      }
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.mediaAssetCollection.deleteMany({ where: { mediaAssetId: assetId } });
    if (!uniqueIds.length) return;
    await tx.mediaAssetCollection.createMany({
      data: uniqueIds.map((mediaCollectionId) => ({
        mediaAssetId: assetId,
        mediaCollectionId,
      })),
    });
  });
}
