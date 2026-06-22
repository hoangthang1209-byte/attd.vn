import "server-only";
import { prisma } from "@/lib/prisma";
import {
  classifyProductionFile,
  isPreviewableMime,
  shouldForceDownload,
} from "@/features/storage/file-classification";
import { getR2SignedAccessUrl } from "@/features/storage/r2/r2-production-file.service";
import { R2_PRIVATE_URL_SENTINEL } from "@/features/storage/r2/r2-types";

export class ProductionFileAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProductionFileAccessError";
  }
}

async function getProductionFileWithAccess(fileId: string) {
  const file = await prisma.orderProductionFile.findUnique({
    where: { id: fileId },
    include: {
      mediaAsset: true,
      orderItem: { select: { orderId: true } },
    },
  });
  if (!file) throw new ProductionFileAccessError("Không tìm thấy file sản xuất.");
  return file;
}

export async function resolveProductionFileAccessUrl(
  fileId: string,
  mode: "open" | "download",
): Promise<string> {
  const file = await getProductionFileWithAccess(fileId);
  const asset = file.mediaAsset;

  if (asset.storageProvider === "CLOUDFLARE_R2") {
    const classification = classifyProductionFile({
      filename: asset.filename,
      mimeType: asset.mimeType,
      fileSizeBytes: asset.sizeBytes,
      productionFileType: file.type,
    });

    const forceDownload =
      mode === "download" ||
      classification.forceDownload ||
      shouldForceDownload(asset.mimeType, "CLOUDFLARE_R2", asset.format ? `.${asset.format}` : null);

    return getR2SignedAccessUrl(asset.storageKey, {
      disposition: forceDownload ? "attachment" : "inline",
      fileName: asset.originalName ?? asset.filename,
      mimeType: asset.mimeType,
    });
  }

  if (mode === "download" && !isPreviewableMime(asset.mimeType)) {
    return asset.url;
  }

  return asset.url;
}

export function isR2MediaAsset(asset: { storageProvider: string; url: string }): boolean {
  return (
    asset.storageProvider === "CLOUDFLARE_R2" ||
    asset.url.startsWith(R2_PRIVATE_URL_SENTINEL)
  );
}

export function getProductionFileOpenUrl(fileId: string): string {
  return `/api/production-files/${fileId}/open`;
}

export function getProductionFileDownloadUrl(fileId: string): string {
  return `/api/production-files/${fileId}/download`;
}
