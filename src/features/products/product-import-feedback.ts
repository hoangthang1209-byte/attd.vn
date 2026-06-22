import type {
  ProductImportPreviewRow,
  ProductImportValidationError,
} from "@/features/products/product-import-types";

export const FEEDBACK_SYSTEM_COLUMNS = [
  "rowNumber",
  "importStatus",
  "errorFields",
  "errorMessages",
  "warningFields",
  "warningMessages",
  "suggestedFix",
] as const;

export const FEEDBACK_PRODUCT_COLUMNS = [
  "category",
  "productName",
  "productCode",
  "slug",
  "shortDescription",
  "description",
  "material",
  "form",
  "fit",
  "colorName",
  "colorCode",
  "sizeName",
  "dimensions",
  "capacity",
  "stockQty",
  "stockStatus",
  "defaultMoq",
  "leadTime",
  "wholesalePrice",
  "dealerPrice",
  "costPrice",
  "priceTiers",
  "supportsPrinting",
  "supportsEmbroidery",
  "supportsOem",
  "featuredImage",
  "gallery",
  "tags",
  "status",
  "internalNote",
] as const;

export const IMPORT_FEEDBACK_SYSTEM_COLUMNS = new Set<string>([
  ...FEEDBACK_SYSTEM_COLUMNS,
  "normalizedCategory",
  "generatedSku",
  "duplicateOfProductId",
  "duplicateReason",
]);

export type FeedbackJobMeta = {
  fileName: string;
  uploadedAt: Date;
  preset?: string | null;
  status?: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  errorCount: number;
  warningCount: number;
};

export type RowFeedbackIssue = {
  rowNumber: number;
  field: string;
  message: string;
  severity: "error" | "warning";
  suggestedFix?: string;
};

export function isImportFeedbackSystemColumn(columnName: string): boolean {
  return IMPORT_FEEDBACK_SYSTEM_COLUMNS.has(columnName.trim());
}

export function filterProductImportHeaders(headers: string[]): string[] {
  return headers.filter((h) => !isImportFeedbackSystemColumn(h));
}

export function getSuggestedFix(error: Pick<ProductImportValidationError, "field" | "message">): string {
  const fixes: Record<string, string> = {
    productName: "Bổ sung tên sản phẩm.",
    category: "Bổ sung danh mục hoặc bật tự tạo danh mục.",
    defaultMoq: "Số lượng tối thiểu phải là số lớn hơn 0.",
    stockQty: "stockQty phải là số >= 0.",
    wholesalePrice: "Giá phải là số hợp lệ.",
    dealerPrice: "Giá phải là số hợp lệ.",
    costPrice: "Giá phải là số hợp lệ.",
    featuredImage: "Kiểm tra lại URL ảnh, nên dùng link Cloudinary hoặc URL ảnh hợp lệ.",
    gallery: "Kiểm tra lại URL ảnh trong gallery.",
    priceTiers: "priceTiers phải là JSON hợp lệ.",
    productCode: "Mã sản phẩm đã tồn tại, chọn update hoặc đổi mã.",
    sku: "SKU đã tồn tại, chọn update hoặc đổi mã.",
    stockStatus: "Trạng thái tồn kho chỉ nhận IN_STOCK, LOW_STOCK, OUT_OF_STOCK hoặc PREORDER.",
    leadTime: "leadTime phải là số hợp lệ.",
  };
  return fixes[error.field] ?? "Kiểm tra lại giá trị cột này.";
}

export function getDuplicateReason(row: ProductImportPreviewRow): string {
  if (!row.duplicateInfo) return "";
  if (row.duplicateInfo.type === "sku") return "SKU trùng với bản ghi hiện có";
  if (row.duplicateInfo.type === "productCode") return "Mã sản phẩm trùng";
  if (row.duplicateInfo.type === "name+category") return "Tên sản phẩm trùng trong cùng danh mục";
  return "Trùng lặp dữ liệu";
}

function duplicateField(row: ProductImportPreviewRow): string {
  if (!row.duplicateInfo) return "productName";
  if (row.duplicateInfo.type === "sku") return row.sku ? "sku" : "productCode";
  if (row.duplicateInfo.type === "productCode") return "productCode";
  return "productName";
}

export function collectRowFeedbackIssues(row: ProductImportPreviewRow): RowFeedbackIssue[] {
  const issues: RowFeedbackIssue[] = row.validationErrors.map((error) => ({
    rowNumber: row.rowIndex + 1,
    field: error.field,
    message: error.message,
    severity: error.severity ?? "error",
    suggestedFix: error.suggestedFix ?? getSuggestedFix(error),
  }));

  if (row.duplicateInfo) {
    const field = duplicateField(row);
    const message = getDuplicateReason(row);
    const suggestedFix =
      row.duplicateInfo.type === "productCode" || row.duplicateInfo.type === "sku"
        ? "Mã sản phẩm đã tồn tại, chọn update hoặc đổi mã."
        : "Kiểm tra tên sản phẩm và danh mục, hoặc chọn update/skip.";

    if (!row.isValid) {
      issues.push({
        rowNumber: row.rowIndex + 1,
        field,
        message,
        severity: "error",
        suggestedFix,
      });
    } else {
      issues.push({
        rowNumber: row.rowIndex + 1,
        field,
        message,
        severity: "warning",
        suggestedFix,
      });
    }
  }

  return issues;
}

export function getProductFieldValue(row: ProductImportPreviewRow, field: string): unknown {
  if (field === "leadTime" || field === "gallery") return "";
  const value = (row as Record<string, unknown>)[field];
  if (value === undefined || value === null) return "";
  if (typeof value === "boolean") return value ? "true" : "false";
  return value;
}

function escapeCsv(value: unknown): string {
  if (value == null) return "";
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function generateProductImportFeedbackCsv(rows: ProductImportPreviewRow[]): string {
  const headers = [...FEEDBACK_SYSTEM_COLUMNS, ...FEEDBACK_PRODUCT_COLUMNS];
  const lines = [headers.join(",")];

  for (const row of rows) {
    const issues = collectRowFeedbackIssues(row);
    const errorIssues = issues.filter((i) => i.severity === "error");
    const warningIssues = issues.filter((i) => i.severity === "warning");

    lines.push(
      [
        row.rowIndex + 1,
        row.finalAction,
        errorIssues.map((i) => i.field).join(", "),
        errorIssues.map((i) => i.message).join(" | "),
        warningIssues.map((i) => i.field).join(", "),
        warningIssues.map((i) => i.message).join(" | "),
        issues.map((i) => i.suggestedFix).filter(Boolean).join(" | "),
        ...FEEDBACK_PRODUCT_COLUMNS.map((field) => getProductFieldValue(row, field)),
      ]
        .map(escapeCsv)
        .join(","),
    );
  }

  return lines.join("\n");
}

export type CompactPreviewRow = Pick<
  ProductImportPreviewRow,
  | "rowIndex"
  | "productName"
  | "category"
  | "normalizedCategory"
  | "productCode"
  | "slug"
  | "shortDescription"
  | "description"
  | "material"
  | "form"
  | "fit"
  | "colorName"
  | "colorCode"
  | "sizeName"
  | "dimensions"
  | "capacity"
  | "stockQty"
  | "stockStatus"
  | "defaultMoq"
  | "wholesalePrice"
  | "dealerPrice"
  | "costPrice"
  | "priceTiers"
  | "featuredImage"
  | "tags"
  | "status"
  | "sku"
  | "supportsPrinting"
  | "supportsEmbroidery"
  | "supportsOem"
  | "weight"
  | "internalNote"
  | "generatedSku"
  | "validationErrors"
  | "duplicateInfo"
  | "duplicateStrategy"
  | "finalAction"
  | "isValid"
>;

export function compactPreviewRows(rows: ProductImportPreviewRow[]): CompactPreviewRow[] {
  return rows.map((r) => ({
    rowIndex: r.rowIndex,
    productName: r.productName,
    category: r.category,
    normalizedCategory: r.normalizedCategory,
    productCode: r.productCode,
    slug: r.slug,
    shortDescription: r.shortDescription,
    description: r.description,
    material: r.material,
    form: r.form,
    fit: r.fit,
    colorName: r.colorName,
    colorCode: r.colorCode,
    sizeName: r.sizeName,
    dimensions: r.dimensions,
    capacity: r.capacity,
    stockQty: r.stockQty,
    stockStatus: r.stockStatus,
    defaultMoq: r.defaultMoq,
    wholesalePrice: r.wholesalePrice,
    dealerPrice: r.dealerPrice,
    costPrice: r.costPrice,
    priceTiers: r.priceTiers,
    featuredImage: r.featuredImage,
    tags: r.tags,
    status: r.status,
    sku: r.sku,
    supportsPrinting: r.supportsPrinting,
    supportsEmbroidery: r.supportsEmbroidery,
    supportsOem: r.supportsOem,
    weight: r.weight,
    internalNote: r.internalNote,
    generatedSku: r.generatedSku,
    validationErrors: r.validationErrors,
    duplicateInfo: r.duplicateInfo,
    duplicateStrategy: r.duplicateStrategy,
    finalAction: r.finalAction,
    isValid: r.isValid,
  }));
}

export function expandCompactPreviewRows(rows: CompactPreviewRow[]): ProductImportPreviewRow[] {
  return rows.map((r) => ({ ...r }));
}

/** Prefer the editable data sheet when re-uploading feedback workbooks. */
export function pickProductImportSheetName(sheetNames: string[]): string {
  const preferred = ["Sản phẩm", "Biến thể", "Dữ liệu cần sửa"];
  for (const name of preferred) {
    if (sheetNames.includes(name)) return name;
  }
  return sheetNames.find((n) => n !== "Hướng dẫn") ?? sheetNames[0] ?? "";
}
