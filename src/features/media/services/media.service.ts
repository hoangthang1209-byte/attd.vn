import { prisma } from "@/lib/prisma";
import type { MediaFolder } from "@prisma/client";
import { getStorageAdapter } from "@/lib/storage";
import {
  MAX_IMAGE_SIZE,
  MEDIA_TO_STORAGE_FOLDER,
  STORAGE_FOLDER_TO_MEDIA,
  validateImageUpload,
  type StorageFolderKey,
} from "@/lib/storage/types";

export async function listMediaAssets(options?: {
  folder?: MediaFolder;
  search?: string;
}) {
  try {
    return await prisma.mediaAsset.findMany({
      where: {
        ...(options?.folder ? { folder: options.folder } : {}),
        ...(options?.search
          ? { filename: { contains: options.search, mode: "insensitive" } }
          : {}),
      },
      orderBy: { createdAt: "desc" },
    });
  } catch (err) {
    console.error("[media.service] listMediaAssets failed:", err);
    return [];
  }
}

export async function getMediaAssetById(id: string) {
  return prisma.mediaAsset.findUnique({ where: { id } });
}

export async function uploadMediaAsset(input: {
  folder: StorageFolderKey;
  file: File;
  altText?: string;
}) {
  const { folder, file, altText } = input;

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
  const buffer = Buffer.from(await file.arrayBuffer());
  const storage = getStorageAdapter();
  const { url, storageKey } = await storage.upload(
    folder,
    file.name,
    buffer,
    mimeType
  );

  try {
    return await prisma.mediaAsset.create({
      data: {
        filename: file.name,
        url,
        storageKey,
        mimeType,
        sizeBytes: file.size,
        folder: STORAGE_FOLDER_TO_MEDIA[folder],
        altText: altText?.trim() || null,
      },
    });
  } catch (err) {
    await storage.delete(url, storageKey);
    const detail = err instanceof Error ? err.message : String(err);
    if (detail.includes("MediaAsset") || detail.includes("does not exist")) {
      throw new Error(
        "Bảng MediaAsset chưa tồn tại. Chạy: npx prisma migrate deploy"
      );
    }
    throw err;
  }
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
