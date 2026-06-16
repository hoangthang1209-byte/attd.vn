import type {
  ProductImportRow,
  ProductImportColumnMapping,
  ProductImportPreviewRow,
  ProductImportValidationError,
  ProductImportDuplicateInfo,
} from "@/features/products/product-import-types";
import type { ProductImportPreset } from "@/features/products/product-import-presets";
import {
  generateSku,
  getCategorySkuCode,
  generateProductCode,
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

// ─── Validate a row ───────────────────────────────────────────────────────────

export function validateImportRow(row: ProductImportRow): ProductImportValidationError[] {
  const errors: ProductImportValidationError[] = [];

  if (!row.productName) {
    errors.push({ field: "productName", message: "Tên sản phẩm là bắt buộc." });
  }
  if (!row.category) {
    errors.push({ field: "category", message: "Danh mục là bắt buộc." });
  }
  if (row.defaultMoq !== undefined && row.defaultMoq < 1) {
    errors.push({ field: "defaultMoq", message: "MOQ phải >= 1." });
  }
  if (row.stockQty !== undefined && row.stockQty < 0) {
    errors.push({ field: "stockQty", message: "Số lượng tồn không được âm." });
  }
  if (row.wholesalePrice !== undefined && row.wholesalePrice < 0) {
    errors.push({ field: "wholesalePrice", message: "Giá sỉ không hợp lệ." });
  }
  if (row.dealerPrice !== undefined && row.dealerPrice < 0) {
    errors.push({ field: "dealerPrice", message: "Giá đại lý không hợp lệ." });
  }
  if (row.featuredImage && !/^https?:\/\/.+/i.test(row.featuredImage)) {
    errors.push({ field: "featuredImage", message: "URL ảnh không hợp lệ." });
  }
  if (row.priceTiers) {
    try {
      const parsed = JSON.parse(row.priceTiers);
      if (!Array.isArray(parsed)) {
        errors.push({ field: "priceTiers", message: "priceTiers phải là mảng JSON." });
      }
    } catch {
      errors.push({ field: "priceTiers", message: "priceTiers không phải JSON hợp lệ." });
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
  preset: ProductImportPreset
): ProductImportPreviewRow[] {
  return rows.map((row) => {
    const errors = validateImportRow(row);
    const normalizedCategory = normalizeCategoryName(row.category);
    const categoryId = categoryMap.get(normalizedCategory.toLowerCase()) ?? null;
    const catSkuCode = getCategorySkuCode(normalizedCategory);
    const productCode = row.productCode ?? generateProductCode(row.productName, row.material);

    const generatedSku = row.sku?.trim() || generateSku({
      categorySkuCode: catSkuCode,
      productCode,
      colorName: row.colorName,
      colorCode: row.colorCode,
      sizeName: row.sizeName,
      dimensions: row.dimensions,
      capacity: row.capacity,
    });

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
    "Hàng", "Tên sản phẩm", "Danh mục", "Danh mục chuẩn hoá", "Mã hàng",
    "SKU gợi ý", "Màu", "Size", "Trạng thái", "Tồn kho", "Giá sỉ", "Giá ĐL",
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
