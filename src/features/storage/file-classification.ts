import type { ProductionFileType } from "@prisma/client";

export type StorageProviderName = "CLOUDINARY" | "CLOUDFLARE_R2";

export type FileCategory = "image" | "source" | "document" | "archive";

export const ERROR_UNSUPPORTED_FORMAT = "Định dạng file này chưa được hỗ trợ.";
export const ERROR_FILE_TOO_LARGE = "Dung lượng file vượt quá giới hạn cho phép.";
export const ERROR_REQUIRES_PRODUCTION_UPLOAD =
  "Loại tài liệu này cần được tải lên dưới dạng file sản xuất.";
export const ERROR_R2_NOT_CONFIGURED = "Kho lưu file sản xuất chưa được cấu hình.";

export const MAX_CLOUDINARY_PRODUCTION_IMAGE_BYTES = 50 * 1024 * 1024;
export const MAX_R2_PRODUCTION_FILE_BYTES = 100 * 1024 * 1024;

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);
const R2_SOURCE_EXTENSIONS = new Set([".ai", ".psd", ".cdr", ".eps", ".zip"]);
const PDF_EXTENSION = ".pdf";
const SVG_EXTENSION = ".svg";

const EXTENSION_TO_MIME: Record<string, string> = {
  ".pdf": "application/pdf",
  ".ai": "application/postscript",
  ".eps": "application/postscript",
  ".svg": "image/svg+xml",
  ".cdr": "application/octet-stream",
  ".psd": "image/vnd.adobe.photoshop",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".zip": "application/zip",
};

export type FileClassificationInput = {
  filename: string;
  mimeType?: string;
  fileSizeBytes: number;
  productionFileType?: ProductionFileType;
};

export type FileClassificationResult = {
  storageProvider: StorageProviderName;
  category: FileCategory;
  allowed: boolean;
  previewable: boolean;
  forceDownload: boolean;
  maxFileSizeBytes: number;
  mimeType: string | null;
  extension: string | null;
  error?: string;
};

export function getFileExtension(filename: string): string | null {
  const match = filename.toLowerCase().match(/\.[^.]+$/);
  return match?.[0] ?? null;
}

export function inferFileMimeType(filename: string, reportedType?: string): string | null {
  const normalized = reportedType?.toLowerCase().trim() ?? "";
  if (normalized && normalized !== "application/octet-stream") {
    return normalized;
  }
  const ext = getFileExtension(filename);
  if (ext && EXTENSION_TO_MIME[ext]) {
    return EXTENSION_TO_MIME[ext];
  }
  return null;
}

function resolveCategory(ext: string, mimeType: string): FileCategory {
  if (IMAGE_EXTENSIONS.has(ext) || mimeType.startsWith("image/")) return "image";
  if (ext === PDF_EXTENSION) return "document";
  if (ext === SVG_EXTENSION) return "source";
  if (R2_SOURCE_EXTENSIONS.has(ext)) return "source";
  return "archive";
}

function shouldRouteToR2(type: ProductionFileType | undefined, ext: string): boolean {
  if (R2_SOURCE_EXTENSIONS.has(ext)) return true;
  if (ext === PDF_EXTENSION) return true;

  if (ext === SVG_EXTENSION) {
    if (type === "MOCKUP_REFERENCE") return false;
    return true;
  }

  return false;
}

function shouldRouteToCloudinary(type: ProductionFileType | undefined, ext: string): boolean {
  if (IMAGE_EXTENSIONS.has(ext)) return true;
  if (ext === SVG_EXTENSION && type === "MOCKUP_REFERENCE") return true;
  return false;
}

export function isPreviewableMime(mimeType: string): boolean {
  return (
    mimeType.startsWith("image/") ||
    mimeType === "application/pdf" ||
    mimeType === "image/svg+xml"
  );
}

export function shouldForceDownload(
  mimeType: string,
  storageProvider: StorageProviderName,
  extension?: string | null,
): boolean {
  if (storageProvider !== "CLOUDFLARE_R2") return false;
  const ext = extension?.toLowerCase();
  if (ext && [".ai", ".psd", ".cdr", ".eps", ".zip"].includes(ext)) return true;
  return (
    mimeType === "application/postscript" ||
    mimeType === "image/vnd.adobe.photoshop" ||
    mimeType === "application/zip" ||
    mimeType === "application/octet-stream"
  );
}

export function classifyProductionFile(input: FileClassificationInput): FileClassificationResult {
  const ext = getFileExtension(input.filename);
  const mimeType = inferFileMimeType(input.filename, input.mimeType);

  if (!ext || !mimeType) {
    return {
      storageProvider: "CLOUDINARY",
      category: "image",
      allowed: false,
      previewable: false,
      forceDownload: false,
      maxFileSizeBytes: MAX_CLOUDINARY_PRODUCTION_IMAGE_BYTES,
      mimeType: null,
      extension: ext,
      error: ERROR_UNSUPPORTED_FORMAT,
    };
  }

  const category = resolveCategory(ext, mimeType);
  const toR2 = shouldRouteToR2(input.productionFileType, ext);
  const toCloudinary = shouldRouteToCloudinary(input.productionFileType, ext);

  if (!toR2 && !toCloudinary) {
    return {
      storageProvider: "CLOUDINARY",
      category,
      allowed: false,
      previewable: false,
      forceDownload: false,
      maxFileSizeBytes: MAX_CLOUDINARY_PRODUCTION_IMAGE_BYTES,
      mimeType,
      extension: ext,
      error: ERROR_UNSUPPORTED_FORMAT,
    };
  }

  const storageProvider: StorageProviderName = toR2 ? "CLOUDFLARE_R2" : "CLOUDINARY";
  const maxFileSizeBytes =
    storageProvider === "CLOUDFLARE_R2"
      ? MAX_R2_PRODUCTION_FILE_BYTES
      : MAX_CLOUDINARY_PRODUCTION_IMAGE_BYTES;

  if (input.fileSizeBytes <= 0) {
    return {
      storageProvider,
      category,
      allowed: false,
      previewable: false,
      forceDownload: false,
      maxFileSizeBytes,
      mimeType,
      extension: ext,
      error: "File rỗng hoặc không đọc được.",
    };
  }

  if (input.fileSizeBytes > maxFileSizeBytes) {
    return {
      storageProvider,
      category,
      allowed: false,
      previewable: false,
      forceDownload: false,
      maxFileSizeBytes,
      mimeType,
      extension: ext,
      error: ERROR_FILE_TOO_LARGE,
    };
  }

  const previewable =
    storageProvider === "CLOUDINARY"
      ? isPreviewableMime(mimeType)
      : mimeType === "application/pdf" || mimeType === "image/svg+xml";

  const forceDownload = shouldForceDownload(mimeType, storageProvider, ext);

  return {
    storageProvider,
    category,
    allowed: true,
    previewable,
    forceDownload,
    maxFileSizeBytes,
    mimeType,
    extension: ext,
  };
}

export function getProductionUploadHint(classification: FileClassificationResult): string | null {
  if (!classification.allowed) return null;
  if (classification.storageProvider === "CLOUDINARY") {
    return "Ảnh sẽ được tối ưu để xem trước.";
  }
  return "File nguồn sản xuất được lưu bảo mật.";
}

/** @deprecated Use classifyProductionFile — kept for existing imports */
export const ALLOWED_PRODUCTION_FILE_EXTENSIONS = [
  ".pdf", ".ai", ".eps", ".svg", ".cdr", ".psd",
  ".png", ".jpg", ".jpeg", ".webp", ".zip",
] as const;

export const MAX_PRODUCTION_FILE_SIZE = MAX_CLOUDINARY_PRODUCTION_IMAGE_BYTES;

export function inferProductionFileMimeType(
  filename: string,
  reportedType?: string,
): string | null {
  return inferFileMimeType(filename, reportedType);
}

export function validateProductionFileUpload(input: {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  productionFileType?: ProductionFileType;
}): { mimeType: string; storageProvider: StorageProviderName } | { error: string } {
  const result = classifyProductionFile({
    filename: input.filename,
    mimeType: input.mimeType,
    fileSizeBytes: input.sizeBytes,
    productionFileType: input.productionFileType,
  });
  if (!result.allowed || !result.mimeType) {
    return { error: result.error ?? ERROR_UNSUPPORTED_FORMAT };
  }
  return { mimeType: result.mimeType, storageProvider: result.storageProvider };
}

export function isPreviewableProductionMime(mimeType: string): boolean {
  return isPreviewableMime(mimeType);
}
