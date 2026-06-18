import type {
  ProductImportRow,
  ProductImportColumnMapping,
  ProductImportPreviewRow,
  ProductImportValidationError,
  ProductImportDuplicateInfo,
} from "@/features/products/product-import-types";
import type { ProductImportPreset } from "@/features/products/product-import-presets";
import { getSuggestedFix } from "@/features/products/product-import-feedback";
import {
  generateSku,
  requireCategorySkuCode,
  validateProductCodeForCategory,
  buildProductGroupKey,
  CATEGORY_SKU_CODE_MISSING_ERROR,
  ProductSkuError,
} from "@/features/products/product-sku-utils";

// ─── Parsing helpers ──────────────────────────────────────────────────────────

function parseBoolean(val: unknown): boolean | undefined {
  if (typeof val === "boolean") return val;
  if (typeof val !== "string") return undefined;
  const v = val.trim().toLowerCase();
  if (["true", "yes", "1", "có", "co", "x"].includes(v)) return true;
  if (["false", "no", "0", "không", "khong"].includes(v)) return false;
  return undefined;
}

function parseNumber(val: unknown): number | undefined {
  if (typeof val === "number") return isNaN(val) ? undefined : val;
  if (typeof val !== "string") return undefined;
  const n = parseFloat(val.replace(/[,\s]/g, ""));
  return isNaN(n) ? undefined : n;
}

function normalizeStatus(val?: string): string {
  if (!val) return "ACTIVE";
  const v = val.toUpperCase().trim();
  if (["ACTIVE", "DRAFT", "INACTIVE", "ARCHIVED"].includes(v)) return v;
  if (["1", "YES", "CÓ", "HOAT DONG"].includes(v)) return "ACTIVE";
  return "DRAFT";
}

function normalizeStockStatus(val?: string): string {
  if (!val) return "IN_STOCK";
  const v = val.toUpperCase().trim().replace(/[\s_]/g, "_");
  const map: Record<string, string> = {
    "IN_STOCK": "IN_STOCK", "CON_HANG": "IN_STOCK", "CON HANG": "IN_STOCK",
    "LOW_STOCK": "LOW_STOCK", "LOW": "LOW_STOCK", "IT": "LOW_STOCK",
    "OUT_OF_STOCK": "OUT_OF_STOCK", "HET_HANG": "OUT_OF_STOCK", "HET HANG": "OUT_OF_STOCK",
    "PREORDER": "PREORDER", "PREORDER_": "PREORDER",
  };
  return map[v] ?? "IN_STOCK";
}

export function normalizeCategoryName(input: string): string {
  return input.trim().replace(/\s+/g, " ");
}

// ─── Map a raw object to ProductImportRow ─────────────────────────────────────

export function mapRawRowToImportRow(
  raw: Record<string, unknown>,
  mapping: ProductImportColumnMapping,
  rowIndex: number,
  presetDefaults: Record<string, unknown> = {}
): ProductImportRow {
  function get(key: keyof ProductImportColumnMapping): unknown {
    const col = mapping[key];
    if (!col) return undefined;
    return raw[col] ?? raw[col.toLowerCase()] ?? raw[col.toUpperCase()];
  }

  const supportsPrinting = parseBoolean(get("supportsPrinting")) ?? (presetDefaults.supportsPrinting as boolean | undefined);
  const supportsEmbroidery = parseBoolean(get("supportsEmbroidery")) ?? (presetDefaults.supportsEmbroidery as boolean | undefined);
  const supportsOem = parseBoolean(get("supportsOem")) ?? (presetDefaults.supportsOem as boolean | undefined);

  return {
    rowIndex,
    productName: String(get("productName") ?? "").trim(),
    category: String(get("category") ?? "").trim(),
    productCode: String(get("productCode") ?? "").trim() || undefined,
    slug: String(get("slug") ?? "").trim() || undefined,
    shortDescription: String(get("shortDescription") ?? "").trim() || undefined,
    description: String(get("description") ?? "").trim() || undefined,
    material: String(get("material") ?? "").trim() || undefined,
    form: String(get("form") ?? "").trim() || undefined,
    fit: String(get("fit") ?? "").trim() || undefined,
    defaultMoq: parseNumber(get("defaultMoq")),
    useCases: String(get("useCases") ?? "").trim() || undefined,
    targetCustomers: String(get("targetCustomers") ?? "").trim() || undefined,
    supportsPrinting: supportsPrinting ?? false,
    supportsEmbroidery: supportsEmbroidery ?? false,
    supportsOem: supportsOem ?? true,
    tags: String(get("tags") ?? "").trim() || undefined,
    status: normalizeStatus(String(get("status") ?? presetDefaults.status ?? "DRAFT")),
    featuredImage: String(get("featuredImage") ?? "").trim() || undefined,
    sku: String(get("sku") ?? "").trim() || undefined,
    colorName: String(get("colorName") ?? "").trim() || undefined,
    colorCode: String(get("colorCode") ?? "").trim() || undefined,
    sizeName: String(get("sizeName") ?? "").trim() || undefined,
    dimensions: String(get("dimensions") ?? "").trim() || undefined,
    capacity: String(get("capacity") ?? "").trim() || undefined,
    stockQty: parseNumber(get("stockQty")) ?? 0,
    stockStatus: normalizeStockStatus(String(get("stockStatus") ?? presetDefaults.stockStatus ?? "")),
    wholesalePrice: parseNumber(get("wholesalePrice")),
    dealerPrice: parseNumber(get("dealerPrice")),
    costPrice: parseNumber(get("costPrice")),
    priceTiers: String(get("priceTiers") ?? "").trim() || undefined,
    weight: parseNumber(get("weight")),
    internalNote: String(get("internalNote") ?? "").trim() || undefined,
  };
}

function validationError(
  field: string,
  message: string,
): ProductImportValidationError {
  return {
    field,
    message,
    severity: "error",
    suggestedFix: getSuggestedFix({ field, message }),
  };
}

function isInvalidNumericRaw(val: unknown): boolean {
  if (val == null || val === "") return false;
  if (typeof val === "number") return Number.isNaN(val);
  const str = String(val).trim();
  if (!str) return false;
  const n = parseFloat(str.replace(/[,\s]/g, ""));
  return Number.isNaN(n);
}

export function validateRawFieldValues(
  raw: Record<string, unknown>,
  mapping: ProductImportColumnMapping,
): ProductImportValidationError[] {
  const errors: ProductImportValidationError[] = [];
  const checks: { field: keyof ProductImportColumnMapping; label: string }[] = [
    { field: "stockQty", label: "stockQty" },
    { field: "wholesalePrice", label: "Giá sỉ" },
    { field: "dealerPrice", label: "Giá đại lý" },
    { field: "costPrice", label: "Giá vốn" },
    { field: "defaultMoq", label: "MOQ" },
    { field: "weight", label: "weight" },
  ];

  for (const { field, label } of checks) {
    const col = mapping[field];
    if (!col) continue;
    const val = raw[col];
    if (isInvalidNumericRaw(val)) {
      errors.push(validationError(String(field), `${label} phải là số hợp lệ.`));
    }
  }

  return errors;
}

// ─── Validate a row ───────────────────────────────────────────────────────────

export function validateImportRow(row: ProductImportRow): ProductImportValidationError[] {
  const errors: ProductImportValidationError[] = [];

  if (!row.productName) {
    errors.push(validationError("productName", "Tên sản phẩm là bắt buộc."));
  }
  if (!row.category) {
    errors.push(validationError("category", "Danh mục là bắt buộc."));
  }
  if (row.defaultMoq !== undefined && row.defaultMoq < 1) {
    errors.push(validationError("defaultMoq", "MOQ phải >= 1."));
  }
  if (row.stockQty !== undefined && row.stockQty < 0) {
    errors.push(validationError("stockQty", "Số lượng tồn không được âm."));
  }
  if (row.wholesalePrice !== undefined && row.wholesalePrice < 0) {
    errors.push(validationError("wholesalePrice", "Giá sỉ không hợp lệ."));
  }
  if (row.dealerPrice !== undefined && row.dealerPrice < 0) {
    errors.push(validationError("dealerPrice", "Giá đại lý không hợp lệ."));
  }
  if (row.featuredImage && !/^https?:\/\/.+/i.test(row.featuredImage)) {
    errors.push(validationError("featuredImage", "URL ảnh không hợp lệ."));
  }
  if (row.stockStatus && !["IN_STOCK", "LOW_STOCK", "OUT_OF_STOCK", "PREORDER"].includes(row.stockStatus)) {
    errors.push(validationError("stockStatus", "Trạng thái tồn kho không hợp lệ."));
  }
  if (row.priceTiers) {
    try {
      const parsed = JSON.parse(row.priceTiers);
      if (!Array.isArray(parsed)) {
        errors.push(validationError("priceTiers", "priceTiers phải là mảng JSON."));
      }
    } catch {
      errors.push(validationError("priceTiers", "priceTiers không phải JSON hợp lệ."));
    }
  }

  return errors;
}

// ─── Preview rows (client-side) ───────────────────────────────────────────────

export function buildPreviewRows(
  rows: ProductImportRow[],
  categoryMap: Map<string, string>,
  existingSkus: Set<string>,
  existingProductNames: Map<string, string>,
  defaultStrategy: "skip" | "update" | "copy",
  preset: ProductImportPreset,
  categorySkuMap?: Map<string, string | null>
): ProductImportPreviewRow[] {
  const groupCodes = new Map<string, string>();

  return rows.map((row) => {
    const errors = validateImportRow(row);
    const normalizedCategory = normalizeCategoryName(row.category);
    const categoryId = categoryMap.get(normalizedCategory.toLowerCase()) ?? null;
    const categorySkuCode = categoryId
      ? categorySkuMap?.get(categoryId) ?? null
      : null;

    let prefix: string | undefined;
    if (categoryId && categorySkuCode?.trim()) {
      try {
        prefix = requireCategorySkuCode(categorySkuCode);
      } catch (err) {
        errors.push({
          field: "category",
          message: err instanceof ProductSkuError ? err.message : CATEGORY_SKU_CODE_MISSING_ERROR,
        });
      }
    } else if (categoryId) {
      errors.push({
        field: "category",
        message: CATEGORY_SKU_CODE_MISSING_ERROR,
      });
    }

    if (prefix && row.productCode?.trim()) {
      try {
        validateProductCodeForCategory(prefix, row.productCode);
      } catch (err) {
        errors.push({
          field: "productCode",
          message: err instanceof ProductSkuError ? err.message : "Mã sản phẩm không hợp lệ.",
        });
      }
    }

    let productCode = row.productCode;
    if (categoryId && prefix) {
      const groupKey = buildProductGroupKey(categoryId, row.productName, row.productCode);
      if (!groupCodes.has(groupKey)) {
        if (row.productCode?.trim()) {
          groupCodes.set(groupKey, validateProductCodeForCategory(prefix, row.productCode));
        } else {
          const next = groupCodes.size + 1;
          groupCodes.set(groupKey, `${prefix}${String(next).padStart(4, "0")}`);
        }
      }
      productCode = groupCodes.get(groupKey);
    }

    const generatedSku = row.sku?.trim() || (productCode
      ? generateSku({
          productCode,
          colorName: row.colorName,
          colorCode: row.colorCode,
          sizeName: row.sizeName,
          dimensions: row.dimensions,
          capacity: row.capacity,
        })
      : "");

    let duplicateInfo: ProductImportDuplicateInfo | null = null;
    if (generatedSku && existingSkus.has(generatedSku)) {
      duplicateInfo = { type: "sku" };
    } else {
      const nameKey = `${normalizedCategory.toLowerCase()}::${row.productName.toLowerCase()}`;
      if (existingProductNames.has(nameKey)) {
        duplicateInfo = { type: "name+category", existingId: existingProductNames.get(nameKey) };
      }
    }

    if (!categoryId && !preset.defaults.autoCreateCategories) {
      errors.push({ field: "category", message: `Danh mục "${normalizedCategory}" không tồn tại.` });
    }

    const isValid = errors.length === 0;
    const duplicateStrategy = duplicateInfo ? defaultStrategy : "skip";

    let finalAction: ProductImportPreviewRow["finalAction"];
    if (!isValid) {
      finalAction = "invalid";
    } else if (duplicateInfo) {
      if (defaultStrategy === "skip") finalAction = "skip";
      else if (defaultStrategy === "update") finalAction = "update";
      else finalAction = "copy";
    } else {
      finalAction = "create";
    }

    return {
      ...row,
      productCode,
      normalizedCategory,
      generatedSku,
      validationErrors: errors,
      duplicateInfo,
      duplicateStrategy,
      finalAction,
      isValid,
    };
  });
}

// ─── CSV export for validation report ────────────────────────────────────────

export function exportProductImportReportCsv(rows: ProductImportPreviewRow[]): string {
  const headers = [
    "Hàng", "Tên sản phẩm", "Danh mục", "Danh mục chuẩn hoá", "ID sản phẩm",
    "SKU lựa chọn", "Màu", "Size", "Trạng thái", "Tồn kho", "Giá sỉ", "Giá ĐL",
    "Hành động", "Trùng lặp", "Lỗi xác thực",
  ];

  const csvRows = rows.map((r) => [
    r.rowIndex + 1,
    r.productName,
    r.category,
    r.normalizedCategory,
    r.productCode ?? "",
    r.generatedSku,
    r.colorName ?? "",
    r.sizeName ?? "",
    r.status ?? "",
    r.stockQty ?? 0,
    r.wholesalePrice ?? "",
    r.dealerPrice ?? "",
    r.finalAction,
    r.duplicateInfo ? `${r.duplicateInfo.type}` : "",
    r.validationErrors.map((e) => e.message).join("; "),
  ]);

  const escape = (val: unknown) => {
    const s = String(val ?? "");
    if (s.includes(",") || s.includes('"') || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  return [headers, ...csvRows].map((row) => row.map(escape).join(",")).join("\n");
}
