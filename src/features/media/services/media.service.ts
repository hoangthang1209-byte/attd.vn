import { prisma } from "@/lib/prisma";
import type { MediaFolder } from "@prisma/client";
import {
  getStorageAdapter,
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_SIZE,
  MEDIA_TO_STORAGE_FOLDER,
  STORAGE_FOLDER_TO_MEDIA,
  type StorageFolderKey,
} from "@/lib/storage";

export async function listMediaAssets(options?: {
  folder?: MediaFolder;
  search?: string;
}) {
  return prisma.mediaAsset.findMany({
    where: {
      ...(options?.folder ? { folder: options.folder } : {}),
      ...(options?.search
        ? { filename: { contains: options.search, mode: "insensitive" } }
        : {}),
    },
    orderBy: { createdAt: "desc" },
  });
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

  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error(`Định dạng không hỗ trợ: ${file.type}`);
  }
  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error("File quá lớn. Tối đa 4 MB.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const storage = getStorageAdapter();
  const { url, storageKey } = await storage.upload(
    folder,
    file.name,
    buffer,
    file.type
  );

  try {
    return await prisma.mediaAsset.create({
      data: {
        filename: file.name,
        url,
        storageKey,
        mimeType: file.type,
        sizeBytes: file.size,
        folder: STORAGE_FOLDER_TO_MEDIA[folder],
        altText: altText?.trim() || null,
      },
    });
  } catch (err) {
    await storage.delete(url, storageKey);
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
