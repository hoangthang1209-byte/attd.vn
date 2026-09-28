import type { PatternSourceType } from "@prisma/client";

export const PATTERN_IMPORT_MAX_ROWS = 300;

export const PATTERN_IMPORT_TEMPLATE_HEADERS = [
  "Tên rập",
  "Danh mục",
  "Sản phẩm",
  "Base size",
  "Dải size",
  "Quy tắc nhảy size",
  "Nguồn",
  "Nhà cung cấp",
  "Khách hàng",
  "Ghi chú nguồn",
  "Ghi chú",
  "File",
] as const;

export type PatternBulkImportRow = {
  rowNumber: number;
  name: string;
  category: string;
  product: string;
  baseSize: string;
  sizeRange: string;
  gradingRule: string;
  sourceType: string;
  supplier: string;
  customer: string;
  sourceNotes: string;
  notes: string;
  files: string[];
};

export type PatternBulkImportResultItem = {
  rowNumber: number;
  status: "created" | "error";
  id?: string;
  code?: string;
  name: string;
  warnings?: string[];
  message?: string;
};

export type PatternBulkImportResponse = {
  created: number;
  failed: number;
  items: PatternBulkImportResultItem[];
};

const SOURCE_ALIASES: Record<string, PatternSourceType> = {
  internal: "INTERNAL",
  "nội bộ": "INTERNAL",
  "noi bo": "INTERNAL",
  attd: "INTERNAL",
  "rập nội bộ": "INTERNAL",
  "rap noi bo": "INTERNAL",
  "external studio": "EXTERNAL_STUDIO",
  "phòng rập ngoài": "EXTERNAL_STUDIO",
  "phong rap ngoai": "EXTERNAL_STUDIO",
  "rập ngoài": "EXTERNAL_STUDIO",
  "rap ngoai": "EXTERNAL_STUDIO",
  customer: "CUSTOMER",
  "khách hàng": "CUSTOMER",
  "khach hang": "CUSTOMER",
  factory: "FACTORY",
  "nhà máy": "FACTORY",
  "nha may": "FACTORY",
  xưởng: "FACTORY",
  xuong: "FACTORY",
  other: "OTHER",
  khác: "OTHER",
  khac: "OTHER",
};

export function normalizePatternImportSource(value: string): PatternSourceType | null {
  const normalized = value.trim().toLocaleLowerCase("vi-VN");
  if (!normalized) return null;
  if (
    normalized === "internal" ||
    normalized === "external_studio" ||
    normalized === "customer" ||
    normalized === "factory" ||
    normalized === "other"
  ) {
    return normalized.toUpperCase() as PatternSourceType;
  }
  return SOURCE_ALIASES[normalized] ?? null;
}

export function splitPatternImportFiles(value: string): string[] {
  return value
    .split(/[;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function normalizePatternImportHeader(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("vi-VN")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export const PATTERN_IMPORT_HEADER_ALIASES: Record<
  keyof Omit<PatternBulkImportRow, "rowNumber" | "files"> | "files",
  string[]
> = {
  name: ["ten rap", "pattern name", "name"],
  category: ["danh muc", "category"],
  product: ["san pham", "product"],
  baseSize: ["base size", "size goc", "co goc"],
  sizeRange: ["dai size", "size range", "bo size"],
  gradingRule: ["quy tac nhay size", "grading rule", "grading"],
  sourceType: ["nguon", "source", "source type"],
  supplier: ["nha cung cap", "supplier", "xuong rap", "phong rap"],
  customer: ["khach hang", "customer"],
  sourceNotes: ["ghi chu nguon", "source notes"],
  notes: ["ghi chu", "notes"],
  files: ["file", "ten file", "files", "pattern file"],
};
