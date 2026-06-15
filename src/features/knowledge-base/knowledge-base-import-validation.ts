import type {
  ImportPreviewRow,
  ImportRowCandidate,
  ImportValidationIssue,
} from "@/features/knowledge-base/knowledge-base-import-types";
import type { KnowledgeBaseEntryType, KnowledgeBaseEntryStatus, KnowledgeBasePriority } from "@prisma/client";
import { generateKnowledgeBaseSlug, normalizeKnowledgeBaseTags } from "@/features/knowledge-base/knowledge-base-utils";

const VALID_TYPES: KnowledgeBaseEntryType[] = [
  "COMPANY", "PRODUCT", "MATERIAL", "MANUFACTURING", "OEM", "WHOLESALE", "DEALER",
  "PRICING", "POLICY", "CASE_STUDY", "FAQ", "SALES_SCRIPT", "SEO_CONTEXT", "BRAND_VOICE",
  "LOGISTICS", "QUALITY_CONTROL", "CUSTOMER_SEGMENT", "COMPETITOR_NOTE",
];

const VALID_STATUSES: KnowledgeBaseEntryStatus[] = ["DRAFT", "ACTIVE", "ARCHIVED"];
const VALID_PRIORITIES: KnowledgeBasePriority[] = ["HIGH", "MEDIUM", "LOW"];

export function parseEntryType(value: string | undefined): KnowledgeBaseEntryType | null {
  if (!value?.trim()) return null;
  const raw = value.trim();
  const normalized = raw.toUpperCase().replace(/[\s-]+/g, "_");

  const aliasMap: Record<string, KnowledgeBaseEntryType> = {
    SAN_PHAM: "PRODUCT",
    DAI_LY: "DEALER",
    CHINH_SACH: "POLICY",
  };

  const lower = raw.toLowerCase();
  if (lower.includes("sản phẩm") || lower.includes("san pham")) return "PRODUCT";
  if (lower.includes("đại lý") || lower.includes("dai ly")) return "DEALER";
  if (lower.includes("chính sách") || lower.includes("chinh sach")) return "POLICY";

  const alias = aliasMap[normalized];
  if (alias) return alias;

  return VALID_TYPES.includes(normalized as KnowledgeBaseEntryType)
    ? (normalized as KnowledgeBaseEntryType)
    : null;
}

export function parseStatus(value: string | undefined): KnowledgeBaseEntryStatus {
  if (!value?.trim()) return "DRAFT";
  const normalized = value.trim().toUpperCase();
  if (normalized === "ĐANG SỬ DỤNG" || normalized === "ACTIVE") return "ACTIVE";
  if (normalized === "LƯU TRỮ" || normalized === "ARCHIVED") return "ARCHIVED";
  return VALID_STATUSES.includes(normalized as KnowledgeBaseEntryStatus)
    ? (normalized as KnowledgeBaseEntryStatus)
    : "DRAFT";
}

export function parsePriority(value: string | undefined): KnowledgeBasePriority {
  if (!value?.trim()) return "MEDIUM";
  const normalized = value.trim().toUpperCase();
  if (normalized === "CAO" || normalized === "HIGH") return "HIGH";
  if (normalized === "THẤP" || normalized === "LOW") return "LOW";
  return VALID_PRIORITIES.includes(normalized as KnowledgeBasePriority)
    ? (normalized as KnowledgeBasePriority)
    : "MEDIUM";
}

export function parseTags(value: string | undefined): string[] {
  if (!value?.trim()) return [];
  return normalizeKnowledgeBaseTags(value.split(/[,;|]/));
}

export function parseUsageScope(value: string | undefined): string[] {
  if (!value?.trim()) return [];
  return value.split(/[,;|]/).map((s) => s.trim().toUpperCase()).filter(Boolean);
}

export function parseBoolean(value: string | undefined): boolean {
  if (!value?.trim()) return false;
  const v = value.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "có" || v === "verified";
}

export function validateImportRow(
  row: ImportRowCandidate,
  existingSlugs: Set<string>,
  existingTitles: Set<string>
): ImportValidationIssue[] {
  const issues: ImportValidationIssue[] = [];

  if (!row.title.trim()) {
    issues.push({ level: "error", code: "MISSING_TITLE", message: "Thiếu tiêu đề" });
  }

  if (!row.slug.trim()) {
    issues.push({ level: "error", code: "MISSING_SLUG", message: "Thiếu slug" });
  } else if (existingSlugs.has(row.slug)) {
    issues.push({ level: "warning", code: "DUPLICATE_SLUG", message: "Slug đã tồn tại" });
  }

  if (!row.categoryId) {
    issues.push({ level: "error", code: "MISSING_CATEGORY", message: "Thiếu danh mục" });
  }

  if (!row.content?.trim() && !row.summary?.trim()) {
    issues.push({ level: "warning", code: "MISSING_CONTENT", message: "Thiếu nội dung/tóm tắt" });
  }

  if (!VALID_TYPES.includes(row.type)) {
    issues.push({ level: "error", code: "INVALID_TYPE", message: "Loại dữ liệu không hợp lệ" });
  }

  if (row.tags.length === 0) {
    issues.push({ level: "info", code: "MISSING_TAGS", message: "Chưa có tags" });
  }

  if (!row.isVerified) {
    issues.push({ level: "info", code: "NOT_VERIFIED", message: "Chưa kiểm chứng" });
  }

  const normalizedTitle = row.title.trim().toLowerCase();
  if (normalizedTitle && existingTitles.has(normalizedTitle)) {
    issues.push({ level: "warning", code: "DUPLICATE_TITLE", message: "Tiêu đề trùng" });
  }

  return issues;
}

export function buildPreviewRow(
  row: ImportRowCandidate,
  existingSlugs: Map<string, string>,
  existingTitles: Set<string>,
  similarTitles: Map<string, string>
): ImportPreviewRow {
  const slugSet = new Set(existingSlugs.keys());
  const issues = validateImportRow(row, slugSet, existingTitles);
  const duplicateSlug = issues.some((i) => i.code === "DUPLICATE_SLUG");
  const duplicateTitle = issues.some((i) => i.code === "DUPLICATE_TITLE");
  const similarEntryId = similarTitles.get(row.title.trim().toLowerCase());
  const existingEntryId = duplicateSlug
    ? existingSlugs.get(row.slug)
    : similarEntryId;
  const similarTitle = Boolean(similarEntryId && !duplicateSlug);
  const hasError = issues.some((i) => i.level === "error");

  return {
    ...row,
    issues,
    duplicateSlug,
    duplicateTitle,
    similarTitle,
    existingEntryId,
    canImport: !hasError,
  };
}

export function ensureUniqueSlug(baseSlug: string, usedSlugs: Set<string>): string {
  let slug = baseSlug;
  let counter = 2;
  while (usedSlugs.has(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }
  usedSlugs.add(slug);
  return slug;
}

export function titleSimilarity(a: string, b: string): number {
  const na = a.trim().toLowerCase();
  const nb = b.trim().toLowerCase();
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.9;

  const longer = na.length > nb.length ? na : nb;
  const shorter = na.length > nb.length ? nb : na;
  if (longer.length === 0) return 1;

  let matches = 0;
  const wordsA = new Set(na.split(/\s+/));
  const wordsB = nb.split(/\s+/);
  for (const word of wordsB) {
    if (wordsA.has(word)) matches += 1;
  }
  return matches / Math.max(wordsA.size, wordsB.length);
}

export function findSimilarTitles(
  title: string,
  existing: Array<{ id: string; title: string }>,
  threshold = 0.85
): string | undefined {
  const normalized = title.trim().toLowerCase();
  for (const entry of existing) {
    if (titleSimilarity(normalized, entry.title) >= threshold) {
      return entry.id;
    }
  }
  return undefined;
}

export function slugFromTitle(title: string): string {
  return generateKnowledgeBaseSlug(title);
}
