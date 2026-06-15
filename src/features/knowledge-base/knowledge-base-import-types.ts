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

export type DuplicateBehavior = "skip" | "update" | "copy";

export type ColumnMapping = Record<string, string>;

export type ImportDefaultValues = {
  type?: KnowledgeBaseEntryType;
  status?: KnowledgeBaseEntryStatus;
  priority?: KnowledgeBasePriority;
  usageScope?: string[];
  isVerified?: boolean;
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
  sourceName: string | null;
  sourceUrl: string | null;
  sourceType: string | null;
  sourceNote: string | null;
  sourceId?: string | null;
};

export type ImportPreviewRow = ImportRowCandidate & {
  issues: ImportValidationIssue[];
  duplicateSlug: boolean;
  duplicateTitle: boolean;
  strongDuplicate: boolean;
  similarTitle: boolean;
  existingEntryId?: string;
  canImport: boolean;
  duplicateStrategy: DuplicateBehavior;
};

export type ImportMappingPreset = {
  id: string;
  label: string;
  description: string;
  mapping: ColumnMapping;
  defaults: ImportDefaultValues;
};

export const KB_IMPORT_FIELDS = [
  { key: "title", label: "Tiêu đề (title)" },
  { key: "content", label: "Nội dung (content)" },
  { key: "category", label: "Danh mục (category)" },
  { key: "type", label: "Loại (type)" },
  { key: "status", label: "Trạng thái (status)" },
  { key: "priority", label: "Ưu tiên (priority)" },
  { key: "tags", label: "Tags" },
  { key: "usageScope", label: "Mục đích sử dụng (usageScope)" },
  { key: "isVerified", label: "Đã kiểm chứng (isVerified)" },
  { key: "source", label: "Tên nguồn (source)" },
  { key: "sourceUrl", label: "Đường dẫn nguồn (sourceUrl)" },
  { key: "sourceType", label: "Loại nguồn (sourceType)" },
  { key: "sourceNote", label: "Ghi chú nguồn (sourceNote)" },
  { key: "structuredData", label: "Dữ liệu chi tiết JSON (structuredData)" },
  { key: "structuredData.materials", label: "Chất liệu (materials)" },
  { key: "structuredData.printMethods", label: "Phương pháp in (printMethods)" },
  { key: "structuredData.owner", label: "Người phụ trách (owner)" },
  { key: "structuredData.moq", label: "MOQ" },
  { key: "structuredData.leadTime", label: "Lead time" },
  { key: "structuredData.material", label: "Chất liệu (material)" },
] as const;

export type KnowledgeBaseImportJobStatus = "PENDING" | "COMPLETED" | "FAILED" | "PARTIAL";

export type KnowledgeBaseImportJobRecord = {
  id: string;
  fileName: string;
  fileType: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  createdRows: number;
  updatedRows: number;
  skippedRows: number;
  duplicateRows: number;
  status: KnowledgeBaseImportJobStatus;
  errorMessage: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown> | null;
};

export type ImportPreviewResult = {
  rows: ImportPreviewRow[];
  summary: {
    total: number;
    valid: number;
    invalid: number;
    warnings: number;
    duplicates: number;
  };
};

export type ImportExecuteResult = {
  totalRows: number;
  created: number;
  updated: number;
  skipped: number;
  invalid: number;
  duplicates: number;
  failed: number;
  errors: string[];
  jobId: string;
  status: KnowledgeBaseImportJobStatus;
  createdCategoryCount: number;
  linkedSourceCount: number;
  createdSourceCount: number;
};

export type PreviewFilter = "all" | "valid" | "invalid" | "duplicate";
