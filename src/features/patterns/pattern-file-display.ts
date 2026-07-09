import type { PatternFileType } from "@prisma/client";

const DOWNLOAD_ONLY_EXTENSIONS = new Set([
  "DXF",
  "PLT",
  "AI",
  "PSD",
  "CDR",
  "EPS",
  "ZIP",
]);

export function getPatternFileExtension(fileName: string | null | undefined): string {
  if (!fileName) return "";
  const parts = fileName.split(".");
  if (parts.length < 2) return "";
  return parts.at(-1)?.toUpperCase() ?? "";
}

export function formatPatternFileSize(bytes: number | null | undefined): string {
  if (bytes == null || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10_240 ? 1 : 0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function patternFileIconLabel(
  type: PatternFileType,
  fileName: string | null | undefined,
): string {
  const ext = getPatternFileExtension(fileName);
  if (ext) return ext;
  return type;
}

export function isPatternFileDownloadOnly(
  type: PatternFileType,
  fileName: string | null | undefined,
): boolean {
  const ext = getPatternFileExtension(fileName);
  if (ext && DOWNLOAD_ONLY_EXTENSIONS.has(ext)) return true;
  return type === "DXF" || type === "PLT" || type === "AI" || type === "ZIP";
}

export function patternFilePreviewMode(
  type: PatternFileType,
  fileName: string | null | undefined,
  previewUrl: string | null | undefined,
): "image" | "pdf" | "download" {
  if (!previewUrl) return "download";
  if (isPatternFileDownloadOnly(type, fileName)) return "download";
  if (type === "PDF") return "pdf";
  if (type === "IMAGE") return "image";
  const ext = getPatternFileExtension(fileName);
  if (ext === "PDF") return "pdf";
  if (["JPG", "JPEG", "PNG", "GIF", "WEBP", "SVG"].includes(ext)) return "image";
  return "download";
}
