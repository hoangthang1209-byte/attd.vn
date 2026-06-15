import type {
  KnowledgeBaseEntryStatus,
  KnowledgeBaseEntryType,
  KnowledgeBasePriority,
} from "@prisma/client";

export type ImportValidationLevel = "error" | "warning" | "info";

export type ImportValidationIssue = {
  level: ImportValidationLevel;
  code: string;
  message: string;
};

export type ImportRowCandidate = {
  rowNumber: number;
  title: string;
  slug: string;
  summary: string | null;
  content: string | null;
  type: KnowledgeBaseEntryType;
  categoryId: string | null;
  categoryName: string | null;
  status: KnowledgeBaseEntryStatus;
  priority: KnowledgeBasePriority;
  tags: string[];
  usageScope: string[];
  isVerified: boolean;
  structuredData: Record<string, unknown> | null;
};

export type ImportPreviewRow = ImportRowCandidate & {
  issues: ImportValidationIssue[];
  duplicateSlug?: boolean;
  duplicateTitle?: boolean;
  similarTitle?: boolean;
  existingEntryId?: string;
  canImport: boolean;
};

export type DuplicateBehavior = "skip" | "update" | "copy";

export type ColumnMapping = Record<string, string>;

export type ImportMappingPreset = {
  id: string;
  label: string;
  description: string;
  mapping: ColumnMapping;
};

export const KB_IMPORT_FIELDS = [
  { key: "title", label: "Tiêu đề" },
  { key: "slug", label: "Slug" },
  { key: "summary", label: "Tóm tắt" },
  { key: "content", label: "Nội dung" },
  { key: "type", label: "Loại" },
  { key: "category", label: "Danh mục" },
  { key: "status", label: "Trạng thái" },
  { key: "priority", label: "Ưu tiên" },
  { key: "tags", label: "Tags" },
  { key: "usageScope", label: "Mục đích sử dụng" },
  { key: "isVerified", label: "Đã kiểm chứng" },
  { key: "structuredData.moq", label: "MOQ" },
  { key: "structuredData.leadTime", label: "Lead time" },
  { key: "structuredData.material", label: "Chất liệu" },
  { key: "structuredData.form", label: "Form dáng" },
  { key: "structuredData.colors", label: "Màu sắc" },
  { key: "structuredData.sizes", label: "Kích thước" },
  { key: "structuredData.useCases", label: "Ứng dụng" },
  { key: "structuredData.services", label: "Dịch vụ hỗ trợ" },
  { key: "structuredData.targetAudience", label: "Đối tượng" },
  { key: "structuredData.pricingPolicy", label: "Chính sách giá" },
  { key: "structuredData.policyName", label: "Chính sách áp dụng" },
  { key: "structuredData.conditions", label: "Điều kiện" },
  { key: "structuredData.questions", label: "Câu hỏi (FAQ)" },
  { key: "structuredData.answers", label: "Câu trả lời (FAQ)" },
  { key: "structuredData.notes", label: "Ghi chú chi tiết" },
] as const;

export type KnowledgeBaseImportJobRecord = {
  id: string;
  filename: string;
  rows: number;
  imported: number;
  skipped: number;
  errors: string[];
  createdBy: string | null;
  createdAt: string;
};

export type ImportPreviewResult = {
  rows: ImportPreviewRow[];
  summary: {
    total: number;
    valid: number;
    errors: number;
    warnings: number;
    duplicates: number;
  };
};

export type ImportExecuteResult = {
  imported: number;
  skipped: number;
  errors: string[];
  jobId: string;
};
