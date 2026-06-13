export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
] as const;

export const ALLOWED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

const EXTENSION_TO_MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

export function inferImageMimeType(
  filename: string,
  reportedType?: string
): string | null {
  const normalized = reportedType?.toLowerCase().trim() ?? "";
  if (ALLOWED_IMAGE_TYPES.includes(normalized as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    return normalized;
  }

  const ext = filename.toLowerCase().match(/\.[^.]+$/)?.[0];
  if (ext && EXTENSION_TO_MIME[ext]) {
    return EXTENSION_TO_MIME[ext];
  }

  return null;
}

export function validateImageUpload(input: {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  maxSizeBytes?: number;
}): { mimeType: string } | { error: string } {
  const maxSize = input.maxSizeBytes ?? 4 * 1024 * 1024;
  const mimeType = inferImageMimeType(input.filename, input.mimeType);

  if (!mimeType) {
    return {
      error: `Định dạng không hỗ trợ. Chỉ chấp nhận: ${ALLOWED_IMAGE_EXTENSIONS.join(", ")}`,
    };
  }

  if (input.sizeBytes > maxSize) {
    return {
      error: `File quá lớn (${(input.sizeBytes / 1024 / 1024).toFixed(1)} MB). Tối đa ${(maxSize / 1024 / 1024).toFixed(0)} MB.`,
    };
  }

  if (input.sizeBytes <= 0) {
    return { error: "File rỗng hoặc không đọc được." };
  }

  return { mimeType };
}
