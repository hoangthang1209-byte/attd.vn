export const ALLOWED_PRODUCTION_FILE_EXTENSIONS = [
  ".pdf",
  ".ai",
  ".eps",
  ".svg",
  ".cdr",
  ".psd",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".zip",
] as const;

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
  ".zip": "application/zip",
};

export const MAX_PRODUCTION_FILE_SIZE = 50 * 1024 * 1024;

export function inferProductionFileMimeType(
  filename: string,
  reportedType?: string,
): string | null {
  const normalized = reportedType?.toLowerCase().trim() ?? "";
  if (normalized && normalized !== "application/octet-stream") {
    return normalized;
  }
  const ext = filename.toLowerCase().match(/\.[^.]+$/)?.[0];
  if (ext && EXTENSION_TO_MIME[ext]) {
    return EXTENSION_TO_MIME[ext];
  }
  return null;
}

export function validateProductionFileUpload(input: {
  filename: string;
  mimeType: string;
  sizeBytes: number;
}): { mimeType: string } | { error: string } {
  const mimeType = inferProductionFileMimeType(input.filename, input.mimeType);
  if (!mimeType) {
    return {
      error: `Định dạng không hỗ trợ. Chấp nhận: ${ALLOWED_PRODUCTION_FILE_EXTENSIONS.join(", ")}`,
    };
  }
  if (input.sizeBytes <= 0) {
    return { error: "File rỗng hoặc không đọc được." };
  }
  if (input.sizeBytes > MAX_PRODUCTION_FILE_SIZE) {
    return {
      error: `File quá lớn (${(input.sizeBytes / 1024 / 1024).toFixed(1)} MB). Tối đa ${MAX_PRODUCTION_FILE_SIZE / 1024 / 1024} MB.`,
    };
  }
  return { mimeType };
}

export function isPreviewableProductionMime(mimeType: string): boolean {
  return (
    mimeType.startsWith("image/") ||
    mimeType === "application/pdf" ||
    mimeType === "image/svg+xml"
  );
}
