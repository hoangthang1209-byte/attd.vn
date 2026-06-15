import type {
  ImportPreviewRow,
  ImportRowCandidate,
  ImportValidationIssue,
  DuplicateBehavior,
} from "@/features/knowledge-base/knowledge-base-import-types";
import { generateKnowledgeBaseSlug } from "@/features/knowledge-base/knowledge-base-utils";
import { VALID_TYPES } from "@/features/knowledge-base/knowledge-base-import-utils";

export function validateImportRow(
  row: ImportRowCandidate,
  existingSlugs: Set<string>,
  existingTitleCategory: Set<string>,
  autoCreateCategories = false
): ImportValidationIssue[] {
  const issues: ImportValidationIssue[] = [];

  if (!row.title.trim()) {
    issues.push({ level: "error", code: "MISSING_TITLE", message: "Thiếu tiêu đề" });
  }

  if (!row.content?.trim()) {
    issues.push({ level: "error", code: "MISSING_CONTENT", message: "Thiếu nội dung" });
  }

  if (!row.slug.trim() && row.title.trim()) {
    // slug auto-generated — info only
  } else if (row.slug && existingSlugs.has(row.slug)) {
    issues.push({ level: "warning", code: "DUPLICATE_SLUG", message: "Slug đã tồn tại" });
  }

  if (!row.categoryId) {
    if (autoCreateCategories && row.categoryName) {
      issues.push({ level: "info", code: "WILL_CREATE_CATEGORY", message: "Sẽ tạo danh mục mới" });
    } else {
      issues.push({ level: "warning", code: "MISSING_CATEGORY", message: "Chưa xác định danh mục" });
    }
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

  const titleKey = `${row.title.trim().toLowerCase()}::${row.categoryId ?? ""}`;
  if (row.title.trim() && existingTitleCategory.has(titleKey)) {
    issues.push({ level: "warning", code: "STRONG_DUPLICATE", message: "Trùng tiêu đề + danh mục" });
  }

  return issues;
}

export function buildPreviewRow(
  row: ImportRowCandidate,
  existingSlugs: Map<string, string>,
  existingTitleCategory: Set<string>,
  similarTitles: Map<string, string>,
  defaultDuplicateStrategy: DuplicateBehavior = "skip",
  autoCreateCategories = false
): ImportPreviewRow {
  const slugSet = new Set(existingSlugs.keys());
  const issues = validateImportRow(row, slugSet, existingTitleCategory, autoCreateCategories);
  const duplicateSlug = issues.some((i) => i.code === "DUPLICATE_SLUG");
  const strongDuplicate = issues.some((i) => i.code === "STRONG_DUPLICATE");
  const duplicateTitle = strongDuplicate || similarTitles.has(row.title.trim().toLowerCase());
  const similarEntryId = similarTitles.get(row.title.trim().toLowerCase());
  const existingEntryId = duplicateSlug
    ? existingSlugs.get(row.slug)
    : similarEntryId;
  const similarTitle = Boolean(similarEntryId && !duplicateSlug && !strongDuplicate);
  const hasError = issues.some((i) => i.level === "error");
  const canImport =
    !hasError && (Boolean(row.categoryId) || (autoCreateCategories && Boolean(row.categoryName)));

  return {
    ...row,
    issues,
    duplicateSlug,
    duplicateTitle,
    strongDuplicate,
    similarTitle,
    existingEntryId,
    canImport,
    duplicateStrategy: defaultDuplicateStrategy,
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

  const wordsA = new Set(na.split(/\s+/));
  const wordsB = nb.split(/\s+/);
  let matches = 0;
  for (const word of wordsB) {
    if (wordsA.has(word)) matches += 1;
  }
  return matches / Math.max(wordsA.size, wordsB.length);
}

export function findSimilarTitles(
  title: string,
  existing: Array<{ id: string; title: string; categoryId: string }>,
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

export function copyTitle(original: string): string {
  return `${original.trim()} (Copy)`;
}
