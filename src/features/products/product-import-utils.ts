import type {
  ProductImportRow,
  ProductImportColumnMapping,
  ProductImportPreviewRow,
  ProductImportValidationError,
  ProductImportDuplicateInfo,
} from "@/features/products/product-import-types";
import type { ProductImportPreset } from "@/features/products/product-import-presets";
import { getSuggestedFix } from "@/features/products/product-import-feedback";
import { IMPORT_CLEAR_TOKEN } from "@/features/products/product-import-constants";
import { isValidImageUrl } from "@/features/products/product-admin-input";
import {
  buildDisplayLabelFromOptions,
  hasStructuredAndLegacyConflict,
  parseStructuredOptionValues,
} from "@/features/products/product-import-options-parser";
import { parseProductAttributesField } from "@/features/products/product-attribute-assignment.utils";
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

export function isClearToken(val: unknown): boolean {
  return String(val ?? "").trim() === IMPORT_CLEAR_TOKEN;
}

function readCell(raw: Record<string, unknown>, col?: string): unknown {
  if (!col) return undefined;
  return raw[col] ?? raw[col.toLowerCase()] ?? raw[col.toUpperCase()];
}

function readStringField(
  raw: Record<string, unknown>,
  col: string | undefined,
  present: Record<string, boolean>,
  key: string,
): string | undefined {
  if (!col) return undefined;
  const val = readCell(raw, col);
  if (val == null || String(val).trim() === "") return undefined;
  present[key] = true;
  if (isClearToken(val)) return IMPORT_CLEAR_TOKEN;
  return String(val).trim();
}

function readOptionalNumberField(
  raw: Record<string, unknown>,
  col: string | undefined,
  present: Record<string, boolean>,
  key: string,
): number | undefined {
  if (!col) return undefined;
  const val = readCell(raw, col);
  if (val == null || String(val).trim() === "") return undefined;
  present[key] = true;
  if (isClearToken(val)) return undefined;
  return parseNumber(val);
}

// ─── Map a raw object to ProductImportRow ─────────────────────────────────────

export function mapRawRowToImportRow(
  raw: Record<string, unknown>,
  mapping: ProductImportColumnMapping,
  rowIndex: number,
  presetDefaults: Record<string, unknown> = {},
  entityType: ProductImportRow["entityType"] = "product",
): ProductImportRow {
  const present: Record<string, boolean> = {};

  function get(key: keyof ProductImportColumnMapping): unknown {
    const col = mapping[key];
    if (!col) return undefined;
    return readCell(raw, col);
  }

  const supportsPrinting = parseBoolean(get("supportsPrinting")) ?? (presetDefaults.supportsPrinting as boolean | undefined);
  const supportsEmbroidery = parseBoolean(get("supportsEmbroidery")) ?? (presetDefaults.supportsEmbroidery as boolean | undefined);
  const supportsOem = parseBoolean(get("supportsOem")) ?? (presetDefaults.supportsOem as boolean | undefined);

  const row: ProductImportRow = {
    rowIndex,
    entityType,
    productName: String(get("productName") ?? "").trim(),
    category: String(get("category") ?? "").trim(),
    productCode: readStringField(raw, mapping.productCode, present, "productCode"),
    systemCode: readStringField(raw, mapping.systemCode, present, "systemCode"),
    productId: readStringField(raw, mapping.productId, present, "productId"),
    slug: readStringField(raw, mapping.slug, present, "slug"),
    shortDescription: readStringField(raw, mapping.shortDescription, present, "shortDescription"),
    description: readStringField(raw, mapping.description, present, "description"),
    material: readStringField(raw, mapping.material, present, "material"),
    form: readStringField(raw, mapping.form, present, "form"),
    fit: readStringField(raw, mapping.fit, present, "fit"),
    gsm: readOptionalNumberField(raw, mapping.gsm, present, "gsm"),
    productAttributes: readStringField(raw, mapping.productAttributes, present, "productAttributes"),
    defaultMoq: readOptionalNumberField(raw, mapping.defaultMoq, present, "defaultMoq"),
    leadTime: readStringField(raw, mapping.leadTime, present, "leadTime"),
    useCases: readStringField(raw, mapping.useCases, present, "useCases"),
    targetCustomers: readStringField(raw, mapping.targetCustomers, present, "targetCustomers"),
    supportsPrinting: supportsPrinting ?? false,
    supportsEmbroidery: supportsEmbroidery ?? false,
    supportsOem: supportsOem ?? true,
    tags: readStringField(raw, mapping.tags, present, "tags"),
    status: mapping.status
      ? (readStringField(raw, mapping.status, present, "status") ?? normalizeStatus(String(presetDefaults.status ?? "DRAFT")))
      : normalizeStatus(String(presetDefaults.status ?? "DRAFT")),
    featuredImage: readStringField(raw, mapping.featuredImage, present, "featuredImage"),
    galleryUrls: readStringField(raw, mapping.galleryUrls, present, "galleryUrls"),
    seoTitle: readStringField(raw, mapping.seoTitle, present, "seoTitle"),
    seoDescription: readStringField(raw, mapping.seoDescription, present, "seoDescription"),
    sku: readStringField(raw, mapping.sku, present, "sku"),
    displayLabel: readStringField(raw, mapping.displayLabel, present, "displayLabel"),
    optionValues: readStringField(raw, mapping.optionValues, present, "optionValues"),
    optionGroup: readStringField(raw, mapping.optionGroup, present, "optionGroup"),
    optionValue: readStringField(raw, mapping.optionValue, present, "optionValue"),
    colorName: readStringField(raw, mapping.colorName, present, "colorName"),
    colorCode: readStringField(raw, mapping.colorCode, present, "colorCode"),
    sizeName: readStringField(raw, mapping.sizeName, present, "sizeName"),
    dimensions: readStringField(raw, mapping.dimensions, present, "dimensions"),
    capacity: readStringField(raw, mapping.capacity, present, "capacity"),
    materialOverride: readStringField(raw, mapping.materialOverride, present, "materialOverride"),
    stockQty: readOptionalNumberField(raw, mapping.stockQty, present, "stockQty") ?? 0,
    stockStatus: mapping.stockStatus
      ? normalizeStockStatus(String(readCell(raw, mapping.stockStatus) ?? presetDefaults.stockStatus ?? ""))
      : normalizeStockStatus(String(presetDefaults.stockStatus ?? "")),
    moqOverride: readOptionalNumberField(raw, mapping.moqOverride, present, "moqOverride"),
    leadTimeOverride: readStringField(raw, mapping.leadTimeOverride, present, "leadTimeOverride"),
    imageUrl: readStringField(raw, mapping.imageUrl, present, "imageUrl"),
    variantStatus: readStringField(raw, mapping.variantStatus, present, "variantStatus"),
    wholesalePrice: readOptionalNumberField(raw, mapping.wholesalePrice, present, "wholesalePrice"),
    dealerPrice: readOptionalNumberField(raw, mapping.dealerPrice, present, "dealerPrice"),
    costPrice: readOptionalNumberField(raw, mapping.costPrice, present, "costPrice"),
    priceTiers: readStringField(raw, mapping.priceTiers, present, "priceTiers"),
    weight: readOptionalNumberField(raw, mapping.weight, present, "weight"),
    internalNote: readStringField(raw, mapping.internalNote, present, "internalNote"),
    specGroup: readStringField(raw, mapping.specGroup, present, "specGroup"),
    specLabel: readStringField(raw, mapping.specLabel, present, "specLabel"),
    specValue: readStringField(raw, mapping.specValue, present, "specValue"),
    specSortOrder: readOptionalNumberField(raw, mapping.specSortOrder, present, "specSortOrder"),
    capability: readStringField(raw, mapping.capability, present, "capability"),
    capabilityDescription: readStringField(raw, mapping.capabilityDescription, present, "capabilityDescription"),
    capabilitySortOrder: readOptionalNumberField(raw, mapping.capabilitySortOrder, present, "capabilitySortOrder"),
    capabilityEnabled: mapping.capabilityEnabled
      ? parseBoolean(readCell(raw, mapping.capabilityEnabled))
      : undefined,
    _presentFields: present,
  };

  if (entityType === "specification") {
    row.specLabel = row.specLabel ?? readStringField(raw, mapping.specLabel, present, "specLabel");
    row.specValue = row.specValue ?? readStringField(raw, mapping.specValue, present, "specValue");
  }

  if (entityType === "customization") {
    row.capability = row.capability ?? readStringField(raw, mapping.capability, present, "capability");
  }

  return row;
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

export function validateImportRow(
  row: ProductImportRow,
  importMode?: string,
): ProductImportValidationError[] {
  const errors: ProductImportValidationError[] = [];
  const entityType = row.entityType ?? "product";

  if (entityType === "product") {
    if (importMode === "create-product" && !row.productName) {
      errors.push(validationError("productName", "Tên sản phẩm là bắt buộc."));
    }
    if (importMode === "create-product" && !row.category) {
      errors.push(validationError("category", "Danh mục là bắt buộc."));
    }
    if (importMode === "update-product" && !row.productCode && !row.systemCode && !row.slug && !row.productId) {
      errors.push(validationError("productCode", "Cần productCode, systemCode, slug hoặc ID để cập nhật sản phẩm."));
    }
    if (row.productAttributes?.trim()) {
      try {
        parseProductAttributesField(row.productAttributes);
      } catch (error) {
        errors.push(
          validationError(
            "productAttributes",
            error instanceof Error ? error.message : "Cú pháp productAttributes không hợp lệ.",
          ),
        );
      }
    }
  }

  if (entityType === "variant") {
    if (!row.productCode && !row.systemCode && !row.slug && !row.productId) {
      errors.push(validationError("productCode", "Cần productCode, systemCode, slug hoặc ID sản phẩm."));
    }
    const optionPairs = row.optionValues ? parseStructuredOptionValues(row.optionValues) : [];
    if (hasStructuredAndLegacyConflict(optionPairs, row)) {
      errors.push(
        validationError(
          "optionValues",
          "Không thể dùng đồng thời optionValues có cấu trúc và colorName/sizeName legacy trong cùng một dòng.",
        ),
      );
    }
    if (
      importMode !== "update-variants-bulk" &&
      !row.sku &&
      !optionPairs.length &&
      !row.colorName &&
      !row.sizeName
    ) {
      errors.push(
        validationError("sku", "Cần SKU hoặc tổ hợp thuộc tính (optionValues) hoặc màu/size legacy."),
      );
    }
  }

  if (entityType === "specification") {
    if (!row.productCode && !row.systemCode) {
      errors.push(validationError("productCode", "Cần productCode hoặc systemCode."));
    }
    if (!row.specLabel) {
      errors.push(validationError("specLabel", "Nhãn thông số là bắt buộc."));
    }
    if (!row.specValue) {
      errors.push(validationError("specValue", "Giá trị thông số là bắt buộc."));
    }
  }

  if (entityType === "customization") {
    if (!row.productCode && !row.systemCode) {
      errors.push(validationError("productCode", "Cần productCode hoặc systemCode."));
    }
    if (!row.capability) {
      errors.push(validationError("capability", "Tên khả năng tùy chỉnh là bắt buộc."));
    }
  }

  if (!importMode && entityType === "product") {
    if (!row.productName) {
      errors.push(validationError("productName", "Tên sản phẩm là bắt buộc."));
    }
    if (!row.category) {
      errors.push(validationError("category", "Danh mục là bắt buộc."));
    }
  }

  if (!row.productName && entityType === "product" && importMode === "create-product") {
    errors.push(validationError("productName", "Tên sản phẩm là bắt buộc."));
  }
  if (!row.category && entityType === "product" && importMode === "create-product") {
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
  if (row.featuredImage && row.featuredImage !== IMPORT_CLEAR_TOKEN && !isValidImageUrl(row.featuredImage)) {
    errors.push(validationError("featuredImage", "URL ảnh đại diện không hợp lệ."));
  }
  if (row.galleryUrls && row.galleryUrls !== IMPORT_CLEAR_TOKEN) {
    for (const url of row.galleryUrls.split("|").map((u) => u.trim()).filter(Boolean)) {
      if (!isValidImageUrl(url)) {
        errors.push(validationError("galleryUrls", `URL gallery không hợp lệ: ${url}`));
        break;
      }
    }
  }
  if (row.imageUrl && row.imageUrl !== IMPORT_CLEAR_TOKEN && !isValidImageUrl(row.imageUrl)) {
    errors.push(validationError("imageUrl", "URL ảnh biến thể không hợp lệ."));
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
  if (row.moqOverride !== undefined && row.moqOverride < 1) {
    errors.push(validationError("moqOverride", "MOQ riêng phải >= 1."));
  }
  if (row.variantStatus) {
    const vs = row.variantStatus.toUpperCase();
    if (!["ACTIVE", "INACTIVE", "ARCHIVED"].includes(vs)) {
      errors.push(validationError("variantStatus", "Trạng thái biến thể không hợp lệ."));
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
      entityType: row.entityType ?? "product",
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
