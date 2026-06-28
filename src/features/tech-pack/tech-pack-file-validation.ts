import type { PatternFileType, TechPackAssetFileType } from "@prisma/client";

const ALLOWED_EXTENSIONS = new Set([
  ".ai",
  ".psd",
  ".cdr",
  ".eps",
  ".pdf",
  ".zip",
  ".plt",
  ".dxf",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
]);

const BLOCKED_EXTENSIONS = new Set([
  ".exe",
  ".bat",
  ".cmd",
  ".sh",
  ".msi",
  ".dll",
  ".js",
  ".html",
  ".php",
]);

export function getFileExtension(filename: string): string {
  const match = filename.toLowerCase().match(/\.[^.]+$/);
  return match?.[0] ?? "";
}

export function inferTechPackAssetFileType(filename: string, mimeType?: string): TechPackAssetFileType {
  const ext = getFileExtension(filename);
  if (ext === ".pdf" || mimeType === "application/pdf") return "PDF";
  if ([".png", ".jpg", ".jpeg", ".webp"].includes(ext) || mimeType?.startsWith("image/")) return "IMAGE";
  if (ext === ".ai") return "AI";
  if (ext === ".psd") return "PSD";
  if (ext === ".cdr") return "CDR";
  if (ext === ".eps") return "EPS";
  if (ext === ".plt") return "PLT";
  if (ext === ".dxf") return "DXF";
  if (ext === ".zip") return "ZIP";
  return "OTHER";
}

export function inferPatternFileType(filename: string, mimeType?: string): PatternFileType {
  const ext = getFileExtension(filename);
  if (ext === ".plt") return "PLT";
  if (ext === ".dxf") return "DXF";
  if (ext === ".pdf" || mimeType === "application/pdf") return "PDF";
  if (ext === ".ai") return "AI";
  if (ext === ".zip") return "ZIP";
  if ([".png", ".jpg", ".jpeg", ".webp"].includes(ext) || mimeType?.startsWith("image/")) return "IMAGE";
  return "OTHER";
}

export function validateProductionFilename(filename: string): string | null {
  const ext = getFileExtension(filename);
  if (!ext) return "File phải có phần mở rộng.";
  if (BLOCKED_EXTENSIONS.has(ext)) return "Định dạng file không được phép.";
  if (!ALLOWED_EXTENSIONS.has(ext)) return UPLOAD_ERROR_MESSAGES.unsupportedFormat;
  return null;
}

export const UPLOAD_ERROR_MESSAGES = {
  unsupportedFormat: "Định dạng file chưa được hỗ trợ.",
  cloudinaryMissing: "Thiếu cấu hình Cloudinary.",
  r2Missing: "Thiếu cấu hình R2 private storage.",
  uploadFailed: "Không thể tải file lên. Vui lòng thử lại.",
  missingFile: "Thiếu file.",
} as const;

export function isPreviewableFile(fileType: TechPackAssetFileType | PatternFileType): boolean {
  return fileType === "IMAGE" || fileType === "PDF";
}

export function shouldStoreOnR2(fileType: TechPackAssetFileType | PatternFileType): boolean {
  return ["AI", "PSD", "CDR", "EPS", "PLT", "DXF", "ZIP"].includes(fileType);
}
