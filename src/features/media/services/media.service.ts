import { prisma } from "@/lib/prisma";
import type { MediaFolder, MediaUsageType } from "@prisma/client";
import { getStorageAdapter } from "@/lib/storage";
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
} from "@/lib/productionFileValidation";

export { LARGE_IMAGE_WARNING_SIZE };

export async function listMediaAssets(options?: {
  folder?: MediaFolder;
  usageType?: MediaUsageType;
  search?: string;
  limit?: number;
}) {
  try {
    return await prisma.mediaAsset.findMany({
      where: {
        ...(options?.folder ? { folder: options.folder } : {}),
        ...(options?.usageType ? { usageType: options.usageType } : {}),
        ...(options?.search
          ? {
              OR: [
                { filename: { contains: options.search, mode: "insensitive" } },
                { title: { contains: options.search, mode: "insensitive" } },
                { originalName: { contains: options.search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: options?.limit ?? 200,
    });
  } catch (err) {
    console.error("[media.service] listMediaAssets failed:", err);
    return [];
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

export async function uploadMediaAsset(input: UploadMediaInput): Promise<UploadMediaResult> {
  const { folder, file, altText, title, tags, usageType } = input;

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
  const storage = getStorageAdapter();
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
}): Promise<UploadMediaResult> {
  const { file, title, tags } = input;
  const validation = validateProductionFileUpload({
    filename: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
  });
  if ("error" in validation) {
    throw new Error(validation.error);
  }

  const mimeType = validation.mimeType;
  const buffer = Buffer.from(await file.arrayBuffer());
  const storage = getStorageAdapter();
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

export async function updateMediaAsset(id: string, data: {
  altText?: string;
  title?: string;
  tags?: string[];
}) {
  return prisma.mediaAsset.update({
    where: { id },
    data: {
      altText: data.altText ?? undefined,
      title: data.title ?? undefined,
      tags: data.tags ?? undefined,
    },
  });
}

export async function deleteMediaAsset(id: string) {
  const asset = await prisma.mediaAsset.findUnique({ where: { id } });
  if (!asset) return null;
  const storage = getStorageAdapter();
  await storage.delete(asset.url, asset.storageKey);
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
