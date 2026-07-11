import { prisma } from "@/lib/prisma";
import type { MediaFolder, MediaUsageType } from "@prisma/client";
import {
  deleteStoredMediaObject,
  requireCloudinaryStorageAdapter,
} from "@/lib/storage";
import { classifyProductionFile } from "@/features/storage/file-classification";
import {
  MAX_IMAGE_SIZE,
  LARGE_IMAGE_WARNING_SIZE,
  MEDIA_TO_STORAGE_FOLDER,
  STORAGE_FOLDER_TO_MEDIA,
  validateImageUpload,
  type StorageFolderKey,
} from "@/lib/storage/types";
import {
  validateProductionFileUpload,
  ERROR_REQUIRES_PRODUCTION_UPLOAD,
} from "@/lib/productionFileValidation";
import type { ProductionFileType } from "@prisma/client";
import { deleteR2Object } from "@/features/storage/r2/r2-production-file.service";
import { MEDIA_LIBRARY_PAGE_SIZE } from "@/components/admin/media/media-library-api";

export { LARGE_IMAGE_WARNING_SIZE };
export { MEDIA_LIBRARY_PAGE_SIZE };

export type MediaAssetListFilters = {
  folder?: MediaFolder;
  usageType?: MediaUsageType;
  search?: string;
};

export type MediaAssetListPage = {
  items: Awaited<ReturnType<typeof prisma.mediaAsset.findMany>>;
  nextCursor: string | null;
  hasMore: boolean;
  total: number;
};

function buildMediaAssetWhere(filters: MediaAssetListFilters) {
  return {
    ...(filters.folder ? { folder: filters.folder } : {}),
    ...(filters.usageType ? { usageType: filters.usageType } : {}),
    ...(filters.search
      ? {
          OR: [
            { filename: { contains: filters.search, mode: "insensitive" as const } },
            { title: { contains: filters.search, mode: "insensitive" as const } },
            { originalName: { contains: filters.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
}

export async function listMediaAssets(options?: MediaAssetListFilters & { limit?: number }) {
  try {
    return await prisma.mediaAsset.findMany({
      where: buildMediaAssetWhere(options ?? {}),
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: options?.limit ?? 200,
    });
  } catch (err) {
    console.error("[media.service] listMediaAssets failed:", err);
    return [];
  }
}

export async function listMediaAssetsPage(
  options?: MediaAssetListFilters & {
    limit?: number;
    cursor?: string;
  },
): Promise<MediaAssetListPage> {
  const limit = options?.limit ?? MEDIA_LIBRARY_PAGE_SIZE;
  const where = buildMediaAssetWhere(options ?? {});

  try {
    const [total, rows] = await Promise.all([
      prisma.mediaAsset.count({ where }),
      prisma.mediaAsset.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: limit + 1,
        ...(options?.cursor
          ? {
              cursor: { id: options.cursor },
              skip: 1,
            }
          : {}),
      }),
    ]);

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? (items[items.length - 1]?.id ?? null) : null;

    return { items, nextCursor, hasMore, total };
  } catch (err) {
    console.error("[media.service] listMediaAssetsPage failed:", err);
    return { items: [], nextCursor: null, hasMore: false, total: 0 };
  }
}

export async function getMediaAssetById(id: string) {
  return prisma.mediaAsset.findUnique({ where: { id } });
}

export type UploadMediaInput = {
  folder: StorageFolderKey;
  file: File;
  altText?: string;
  title?: string;
  tags?: string[];
  usageType?: MediaUsageType;
};

export type UploadMediaResult = {
  asset: Awaited<ReturnType<typeof prisma.mediaAsset.create>>;
  warning?: string;
};

function assertNotR2SourceFile(filename: string, mimeType: string, sizeBytes: number): void {
  const classification = classifyProductionFile({
    filename,
    mimeType,
    fileSizeBytes: sizeBytes,
  });
  if (classification.storageProvider === "CLOUDFLARE_R2") {
    throw new Error(ERROR_REQUIRES_PRODUCTION_UPLOAD);
  }
}

export async function uploadMediaAsset(input: UploadMediaInput): Promise<UploadMediaResult> {
  const { folder, file, altText, title, tags, usageType } = input;

  assertNotR2SourceFile(file.name, file.type, file.size);

  const validation = validateImageUpload({
    filename: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    maxSizeBytes: MAX_IMAGE_SIZE,
  });

  if ("error" in validation) {
    throw new Error(validation.error);
  }

  const mimeType = validation.mimeType;
  const warning = file.size > LARGE_IMAGE_WARNING_SIZE
    ? `Ảnh này lớn hơn 500KB (${(file.size / 1024).toFixed(0)}KB), nên tối ưu trước khi upload để website tải nhanh hơn.`
    : undefined;

  const buffer = Buffer.from(await file.arrayBuffer());
  const storage = requireCloudinaryStorageAdapter();
  const result = await storage.upload(folder, file.name, buffer, mimeType);

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";

  try {
    const asset = await prisma.mediaAsset.create({
      data: {
        filename: file.name,
        originalName: file.name,
        url: result.url,
        thumbnailUrl: result.thumbnailUrl ?? null,
        storageKey: result.storageKey,
        storageProvider: "CLOUDINARY",
        publicId: result.publicId ?? null,
        mimeType,
        format: ext || null,
        sizeBytes: file.size,
        width: result.width ?? null,
        height: result.height ?? null,
        folder: STORAGE_FOLDER_TO_MEDIA[folder],
        usageType: usageType ?? "GENERAL",
        altText: altText?.trim() || null,
        title: title?.trim() || null,
        tags: tags ?? [],
      },
    });
    return { asset, warning };
  } catch (err) {
    await storage.delete(result.url, result.storageKey);
    const detail = err instanceof Error ? err.message : String(err);
    if (detail.includes("MediaAsset") || detail.includes("does not exist") || detail.includes("P2021")) {
      throw new Error("CMS tables chưa sẵn sàng — xem bảng chẩn đoán trên trang Media Library");
    }
    throw err;
  }
}

export async function uploadProductionFileAsset(input: {
  file: File;
  title?: string;
  tags?: string[];
  productionFileType?: ProductionFileType;
}): Promise<UploadMediaResult> {
  const { file, title, tags, productionFileType } = input;
  const validation = validateProductionFileUpload({
    filename: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    productionFileType,
  });
  if ("error" in validation) {
    throw new Error(validation.error);
  }
  if (validation.storageProvider === "CLOUDFLARE_R2") {
    throw new Error(ERROR_REQUIRES_PRODUCTION_UPLOAD);
  }

  const mimeType = validation.mimeType;
  const buffer = Buffer.from(await file.arrayBuffer());
  const storage = requireCloudinaryStorageAdapter();
  const result = await storage.upload("general", file.name, buffer, mimeType);
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";

  try {
    const asset = await prisma.mediaAsset.create({
      data: {
        filename: file.name,
        originalName: file.name,
        url: result.url,
        thumbnailUrl: result.thumbnailUrl ?? null,
        storageKey: result.storageKey,
        storageProvider: "CLOUDINARY",
        publicId: result.publicId ?? null,
        mimeType,
        format: ext || null,
        sizeBytes: file.size,
        width: result.width ?? null,
        height: result.height ?? null,
        folder: "GENERAL",
        usageType: "GENERAL",
        title: title?.trim() || null,
        tags: tags ?? [],
      },
    });
    return { asset };
  } catch (err) {
    await storage.delete(result.url, result.storageKey);
    throw err;
  }
}

export const VALID_MEDIA_STORAGE_FOLDERS = Object.keys(STORAGE_FOLDER_TO_MEDIA) as StorageFolderKey[];
export const VALID_MEDIA_USAGE_TYPES: MediaUsageType[] = [
  "PRODUCT",
  "BLOG",
  "KNOWLEDGE_BASE",
  "GENERAL",
];
export const MEDIA_BULK_UPDATE_MAX = 100;

export type MediaMetadataUpdateInput = {
  folder?: MediaFolder;
  usageType?: MediaUsageType;
  altText?: string | null;
  title?: string | null;
  tags?: string[];
};

export function normalizeMediaTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const tag of tags) {
    const trimmed = tag.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    result.push(trimmed);
  }
  return result;
}

export function parseStorageFolderKey(value: unknown): StorageFolderKey | null {
  if (typeof value !== "string") return null;
  return VALID_MEDIA_STORAGE_FOLDERS.includes(value as StorageFolderKey)
    ? (value as StorageFolderKey)
    : null;
}

export function parseMediaUsageType(value: unknown): MediaUsageType | null {
  if (typeof value !== "string") return null;
  return VALID_MEDIA_USAGE_TYPES.includes(value as MediaUsageType)
    ? (value as MediaUsageType)
    : null;
}

function buildMetadataUpdateData(data: MediaMetadataUpdateInput) {
  const updateData: {
    folder?: MediaFolder;
    usageType?: MediaUsageType;
    altText?: string | null;
    title?: string | null;
    tags?: string[];
  } = {};

  if (data.folder !== undefined) updateData.folder = data.folder;
  if (data.usageType !== undefined) updateData.usageType = data.usageType;
  if (data.altText !== undefined) {
    updateData.altText = data.altText?.trim() ? data.altText.trim() : null;
  }
  if (data.title !== undefined) {
    updateData.title = data.title?.trim() ? data.title.trim() : null;
  }
  if (data.tags !== undefined) {
    updateData.tags = normalizeMediaTags(data.tags);
  }

  return updateData;
}

export function parseMediaMetadataPatchBody(
  raw: Record<string, unknown>,
): { ok: true; data: MediaMetadataUpdateInput; hasUpdates: boolean } | { ok: false; message: string } {
  const data: MediaMetadataUpdateInput = {};
  let hasUpdates = false;

  if ("folder" in raw) {
    hasUpdates = true;
    const folderKey = parseStorageFolderKey(raw.folder);
    if (!folderKey) return { ok: false, message: "Phân loại thư mục không hợp lệ" };
    data.folder = STORAGE_FOLDER_TO_MEDIA[folderKey];
  }

  if ("usageType" in raw) {
    hasUpdates = true;
    const usageType = parseMediaUsageType(raw.usageType);
    if (!usageType) return { ok: false, message: "Loại sử dụng ảnh không hợp lệ" };
    data.usageType = usageType;
  }

  if ("altText" in raw) {
    hasUpdates = true;
    if (raw.altText !== null && typeof raw.altText !== "string") {
      return { ok: false, message: "Alt text không hợp lệ" };
    }
    data.altText = raw.altText as string | null;
  }

  if ("title" in raw) {
    hasUpdates = true;
    if (raw.title !== null && typeof raw.title !== "string") {
      return { ok: false, message: "Tiêu đề ảnh không hợp lệ" };
    }
    data.title = raw.title as string | null;
  }

  if ("tags" in raw) {
    hasUpdates = true;
    if (!Array.isArray(raw.tags) || !raw.tags.every((tag) => typeof tag === "string")) {
      return { ok: false, message: "Tags không hợp lệ" };
    }
    data.tags = raw.tags;
  }

  return { ok: true, data, hasUpdates };
}

export async function updateMediaAsset(id: string, data: MediaMetadataUpdateInput) {
  const existing = await prisma.mediaAsset.findUnique({ where: { id } });
  if (!existing) return null;

  return prisma.mediaAsset.update({
    where: { id },
    data: buildMetadataUpdateData(data),
  });
}

export async function bulkUpdateMediaAssets(ids: string[], data: MediaMetadataUpdateInput) {
  const uniqueIds = [...new Set(ids)];
  const result = await prisma.mediaAsset.updateMany({
    where: { id: { in: uniqueIds } },
    data: buildMetadataUpdateData(data),
  });
  return result.count;
}

export async function deleteMediaAsset(id: string) {
  const asset = await prisma.mediaAsset.findUnique({ where: { id } });
  if (!asset) return null;

  if (asset.storageProvider === "CLOUDFLARE_R2") {
    await deleteR2Object(asset.storageKey);
  } else {
    await deleteStoredMediaObject(asset.url, asset.storageKey, asset.storageProvider);
  }

  await prisma.mediaAsset.delete({ where: { id } });
  return asset;
}

export function mediaFolderToStorageKey(folder: MediaFolder): StorageFolderKey {
  return MEDIA_TO_STORAGE_FOLDER[folder];
}

export async function countMediaAssets() {
  try {
    return await prisma.mediaAsset.count();
  } catch {
    return 0;
  }
}
