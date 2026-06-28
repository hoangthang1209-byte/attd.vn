import "server-only";
import { randomUUID } from "crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { isR2Configured, getR2Client } from "@/features/storage/r2/r2-client";
import { sanitizeProductionFileName } from "@/features/storage/r2/r2-signed-url.service";
import { requireCloudinaryStorageAdapter } from "@/lib/storage";
import { isCloudinaryConfigured } from "@/lib/storage/cloudinary-config";
import {
  inferPatternFileType,
  inferTechPackAssetFileType,
  isPreviewableFile,
  shouldStoreOnR2,
  validateProductionFilename,
} from "@/features/tech-pack/tech-pack-file-validation";
import type { PatternFileType, TechPackAssetFileType } from "@prisma/client";

export { isR2Configured, isCloudinaryConfigured };

export function buildTechPackR2ObjectKey(techPackId: string, fileName: string): string {
  const uploadId = randomUUID().slice(0, 8);
  const sanitized = sanitizeProductionFileName(fileName);
  return `tech-pack-files/${techPackId}/${uploadId}-${sanitized}`;
}

export function buildPatternR2ObjectKey(patternId: string, fileName: string): string {
  const uploadId = randomUUID().slice(0, 8);
  const sanitized = sanitizeProductionFileName(fileName);
  return `pattern-files/${patternId}/${uploadId}-${sanitized}`;
}

export async function createR2UploadUrl(objectKey: string, mimeType: string): Promise<string> {
  const { client, config } = await getR2Client();
  const command = new PutObjectCommand({
    Bucket: config.bucketName,
    Key: objectKey,
    ContentType: mimeType || "application/octet-stream",
  });
  return getSignedUrl(client, command, { expiresIn: 900 });
}

export async function uploadPreviewToCloudinary(
  buffer: Buffer,
  filename: string,
  mimeType: string,
  folder: "tech-packs" | "patterns",
): Promise<{ publicId: string; previewUrl: string }> {
  const storage = requireCloudinaryStorageAdapter();
  const result = await storage.upload("general", filename, buffer, mimeType);
  return {
    publicId: result.publicId ?? result.storageKey,
    previewUrl: result.url,
  };
}

export type ResolvedFileUpload = {
  cloudinaryPublicId: string | null;
  previewUrl: string | null;
  r2ObjectKey: string | null;
  originalFileName: string;
  mimeType: string | null;
  fileType: TechPackAssetFileType | PatternFileType;
  previewable: boolean;
  privateOriginal: boolean;
};

export function resolveFileUploadMetadata(input: {
  filename: string;
  mimeType?: string;
  forPattern?: boolean;
}): { error?: string; meta?: ResolvedFileUpload } {
  const validationError = validateProductionFilename(input.filename);
  if (validationError) return { error: validationError };

  const fileType = input.forPattern
    ? inferPatternFileType(input.filename, input.mimeType)
    : inferTechPackAssetFileType(input.filename, input.mimeType);

  return {
    meta: {
      cloudinaryPublicId: null,
      previewUrl: null,
      r2ObjectKey: null,
      originalFileName: input.filename,
      mimeType: input.mimeType ?? null,
      fileType,
      previewable: isPreviewableFile(fileType),
      privateOriginal: shouldStoreOnR2(fileType),
    },
  };
}

export async function prepareR2Upload(input: {
  scope: "tech-pack" | "pattern";
  scopeId: string;
  filename: string;
  mimeType?: string;
  forPattern?: boolean;
}): Promise<{ error?: string; uploadUrl?: string; objectKey?: string; meta?: ResolvedFileUpload }> {
  if (!isR2Configured()) {
    return { error: "Kho lưu file sản xuất chưa được cấu hình." };
  }

  const resolved = resolveFileUploadMetadata({
    filename: input.filename,
    mimeType: input.mimeType,
    forPattern: input.forPattern,
  });
  if (resolved.error || !resolved.meta) return { error: resolved.error };

  if (!resolved.meta.privateOriginal) {
    return { error: "File này không cần tải lên kho riêng tư." };
  }

  const objectKey =
    input.scope === "tech-pack"
      ? buildTechPackR2ObjectKey(input.scopeId, input.filename)
      : buildPatternR2ObjectKey(input.scopeId, input.filename);

  const uploadUrl = await createR2UploadUrl(objectKey, input.mimeType ?? "application/octet-stream");

  return {
    uploadUrl,
    objectKey,
    meta: { ...resolved.meta, r2ObjectKey: objectKey },
  };
}

export async function getR2SignedDownloadUrl(objectKey: string): Promise<string | null> {
  if (!isR2Configured()) return null;
  const { GetObjectCommand } = await import("@aws-sdk/client-s3");
  const { client, config } = await getR2Client();
  const command = new GetObjectCommand({ Bucket: config.bucketName, Key: objectKey });
  return getSignedUrl(client, command, { expiresIn: 300 });
}
