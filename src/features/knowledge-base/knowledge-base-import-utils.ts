import type {
  KnowledgeBaseEntryStatus,
  KnowledgeBaseEntryType,
  KnowledgeBasePriority,
} from "@prisma/client";
import { normalizeKnowledgeBaseTags } from "@/features/knowledge-base/knowledge-base-utils";
import type { KnowledgeBaseUsageScope } from "@/features/knowledge-base/knowledge-base-types";

const VALID_TYPES: KnowledgeBaseEntryType[] = [
  "COMPANY", "PRODUCT", "MATERIAL", "MANUFACTURING", "OEM", "WHOLESALE", "DEALER",
  "PRICING", "POLICY", "CASE_STUDY", "FAQ", "SALES_SCRIPT", "SEO_CONTEXT", "BRAND_VOICE",
  "LOGISTICS", "QUALITY_CONTROL", "CUSTOMER_SEGMENT", "COMPETITOR_NOTE",
];

const VALID_STATUSES: KnowledgeBaseEntryStatus[] = ["DRAFT", "ACTIVE", "ARCHIVED"];
const VALID_PRIORITIES: KnowledgeBasePriority[] = ["HIGH", "MEDIUM", "LOW"];

const VALID_USAGE = [
  "BLOG_AI", "LANDING_PAGE_AI", "PRODUCT_AI", "SEO_PLANNING", "CRM",
  "SALES", "DEALER_PORTAL", "PUBLIC_FAQ", "INTERNAL_ONLY",
];

const USAGE_SCOPE_ALIASES: Record<string, KnowledgeBaseUsageScope> = {
  SALES: "SALES",
  SUPPORT: "CRM",
  SEO: "SEO_PLANNING",
  PRODUCT: "PRODUCT_AI",
  INTERNAL: "INTERNAL_ONLY",
  BLOG: "BLOG_AI",
  CRM: "CRM",
  FAQ: "PUBLIC_FAQ",
};

export function parseTags(value: string | string[] | undefined): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return normalizeKnowledgeBaseTags(value);
  return normalizeKnowledgeBaseTags(value.split(/[,;|]/));
}

export function parseUsageScope(value: string | string[] | undefined): string[] {
  if (!value) return [];
  const parts = Array.isArray(value)
    ? value
    : value.split(/[,;|]/).map((s) => s.trim()).filter(Boolean);

  return [...new Set(
    parts.map((part) => {
      const key = part.trim().toUpperCase().replace(/[\s-]+/g, "_");
      const alias = USAGE_SCOPE_ALIASES[key] ?? USAGE_SCOPE_ALIASES[part.trim().toLowerCase()];
      if (alias) return alias;
      if (VALID_USAGE.includes(key)) return key;
      return part.trim().toUpperCase();
    })
  )];
}

export function parseBoolean(value: string | boolean | number | undefined): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (!value?.toString().trim()) return false;
  const v = value.toString().trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "có" || v === "verified";
}

export function normalizeStatus(value: string | undefined): KnowledgeBaseEntryStatus {
  if (!value?.trim()) return "DRAFT";
  const normalized = value.trim().toUpperCase();
  if (normalized === "ĐANG SỬ DỤNG" || normalized === "ACTIVE") return "ACTIVE";
  if (normalized === "LƯU TRỮ" || normalized === "ARCHIVED") return "ARCHIVED";
  if (normalized === "NHÁP" || normalized === "DRAFT") return "DRAFT";
  return VALID_STATUSES.includes(normalized as KnowledgeBaseEntryStatus)
    ? (normalized as KnowledgeBaseEntryStatus)
    : "DRAFT";
}

export function normalizePriority(value: string | undefined): KnowledgeBasePriority {
  if (!value?.trim()) return "MEDIUM";
  const normalized = value.trim().toUpperCase();
  if (normalized === "CAO" || normalized === "HIGH") return "HIGH";
  if (normalized === "THẤP" || normalized === "LOW") return "LOW";
  if (normalized === "TRUNG BÌNH" || normalized === "MEDIUM") return "MEDIUM";
  return VALID_PRIORITIES.includes(normalized as KnowledgeBasePriority)
    ? (normalized as KnowledgeBasePriority)
    : "MEDIUM";
}

export function normalizeType(value: string | undefined): KnowledgeBaseEntryType | null {
  if (!value?.trim()) return null;
  const raw = value.trim();
  const normalized = raw.toUpperCase().replace(/[\s-]+/g, "_");

  const aliasMap: Record<string, KnowledgeBaseEntryType> = {
    PROCESS: "SALES_SCRIPT",
    SOP: "SALES_SCRIPT",
    SAN_PHAM: "PRODUCT",
    PRODUCTNAME: "PRODUCT",
    DAI_LY: "DEALER",
    CHINH_SACH: "POLICY",
  };

  const lower = raw.toLowerCase();
  if (lower.includes("sản phẩm") || lower.includes("san pham")) return "PRODUCT";
  if (lower.includes("đại lý") || lower.includes("dai ly")) return "DEALER";
  if (lower.includes("chính sách") || lower.includes("chinh sach")) return "POLICY";
  if (lower.includes("faq") || lower.includes("câu hỏi")) return "FAQ";
  if (lower.includes("quy trình") || lower.includes("sop")) return "SALES_SCRIPT";

  const alias = aliasMap[normalized];
  if (alias) return alias;

  return VALID_TYPES.includes(normalized as KnowledgeBaseEntryType)
    ? (normalized as KnowledgeBaseEntryType)
    : null;
}

export function parseStructuredData(value: string | Record<string, unknown> | undefined): Record<string, unknown> | null {
  if (!value) return null;
  if (typeof value === "object" && !Array.isArray(value)) return value;
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return null;
  }
  return null;
}

export function normalizeCategoryName(input: string): string | null {
  const trimmed = input.trim().replace(/\s+/g, " ");
  return trimmed || null;
}

export function getFileTypeFromName(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext === "xlsx" || ext === "xls") return "xlsx";
  if (ext === "csv") return "csv";
  if (ext === "json") return "json";
  return "unknown";
}

export function isSupportedImportFile(filename: string): boolean {
  return getFileTypeFromName(filename) !== "unknown";
}

export function mergeStructuredData(
  base: Record<string, unknown> | null,
  patch: Record<string, unknown>
): Record<string, unknown> {
  return { ...(base ?? {}), ...patch };
}

export { VALID_TYPES, VALID_STATUSES, VALID_PRIORITIES };
