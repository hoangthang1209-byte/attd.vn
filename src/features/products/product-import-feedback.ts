import type {
  ProductImportPreviewRow,
  ProductImportValidationError,
} from "@/features/products/product-import-types";

function escapeCsv(value: unknown): string {
  if (value == null) return "";
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function getSuggestedFix(error: ProductImportValidationError): string {
  const fixes: Record<string, string> = {
    productName: "Bổ sung tên sản phẩm",
    category: "Kiểm tra lại danh mục hoặc bật tự tạo danh mục",
    defaultMoq: "Số lượng tối thiểu phải >= 1",
    stockQty: "stockQty phải là số >= 0",
    wholesalePrice: "Giá phải là số hợp lệ",
    dealerPrice: "Giá phải là số hợp lệ",
    costPrice: "Giá phải là số hợp lệ",
    featuredImage: "Kiểm tra lại URL ảnh",
    priceTiers: "priceTiers phải là JSON hợp lệ, ví dụ [{\"minQty\":50,\"price\":45000}]",
    productCode: "Mã sản phẩm đã tồn tại, chọn update hoặc đổi mã",
    sku: "SKU đã tồn tại, chọn update hoặc đổi mã",
  };
  return fixes[error.field] ?? "Kiểm tra lại giá trị cột này";
}

export function getDuplicateReason(row: ProductImportPreviewRow): string {
  if (!row.duplicateInfo) return "";
  if (row.duplicateInfo.type === "sku") return "SKU trùng với bản ghi hiện có";
  if (row.duplicateInfo.type === "productCode") return "Mã sản phẩm trùng";
  if (row.duplicateInfo.type === "name+category") return "Tên sản phẩm trùng trong cùng danh mục";
  return "Trùng lặp dữ liệu";
}

export function generateProductImportFeedbackCsv(rows: ProductImportPreviewRow[]): string {
  const headers = [
    "rowNumber",
    "importStatus",
    "errorMessages",
    "warningMessages",
    "suggestedFix",
    "category",
    "normalizedCategory",
    "productName",
    "productCode",
    "slug",
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
    "featuredImage",
    "gallery",
    "tags",
    "generatedSku",
    "duplicateOfProductId",
    "duplicateReason",
  ];

  const lines = [headers.join(",")];

  for (const row of rows) {
    const errorMessages = row.validationErrors.map((e) => e.message).join(" | ");
    const suggestedFixes = [
      ...row.validationErrors.map(getSuggestedFix),
      row.duplicateInfo && row.finalAction === "invalid" ? getDuplicateReason(row) : "",
    ]
      .filter(Boolean)
      .join(" | ");

    const warnings: string[] = [];
    if (row.duplicateInfo && row.isValid) {
      warnings.push(getDuplicateReason(row));
    }

    lines.push(
      [
        row.rowIndex + 1,
        row.finalAction,
        errorMessages,
        warnings.join(" | "),
        suggestedFixes,
        row.category,
        row.normalizedCategory,
        row.productName,
        row.productCode ?? "",
        row.slug ?? "",
        row.colorName ?? "",
        row.colorCode ?? "",
        row.sizeName ?? "",
        row.dimensions ?? "",
        row.capacity ?? "",
        row.stockQty ?? "",
        row.stockStatus ?? "",
        row.defaultMoq ?? "",
        "",
        row.wholesalePrice ?? "",
        row.dealerPrice ?? "",
        row.costPrice ?? "",
        row.priceTiers ?? "",
        row.featuredImage ?? "",
        "",
        row.tags ?? "",
        row.generatedSku,
        row.duplicateInfo?.existingId ?? "",
        row.duplicateInfo ? getDuplicateReason(row) : "",
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
