import type { Prisma } from "@prisma/client";
import {
  CUSTOMIZATION_IMPORT_HEADERS,
  PRODUCT_IMPORT_HEADERS,
  SPEC_IMPORT_HEADERS,
  VARIANT_IMPORT_HEADERS,
} from "@/features/products/product-import-v2-templates";
import { IMPORT_SHEET_NAMES } from "@/features/products/product-import-constants";
import type { ProductExportOptions } from "@/features/products/product-export.types";
import { VARIANT_STATUS_LABELS } from "@/features/products/product-variant-labels";
import { escapeCsvValue } from "@/features/import/import-template-utils";

export type ExportProductRecord = Prisma.ProductGetPayload<{
  include: {
    category: { select: { slug: true, skuCode: true } },
    options: { include: { values: true } },
    specifications: true,
    customizationCapabilities: true,
    variants: { include: { optionValues: { select: { optionValueId: true } } } },
  },
}>;

function cell(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  return String(value);
}

function escapeXlsxCell(value: string): string {
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

export function sanitizeExportCell(value: unknown): string {
  return escapeXlsxCell(cell(value));
}

function buildOptionValueMap(product: ExportProductRecord): Map<string, { group: string; label: string; sort: number }> {
  const map = new Map<string, { group: string; label: string; sort: number }>();
  for (const option of product.options) {
    for (const value of option.values) {
      map.set(value.id, {
        group: option.name,
        label: value.label,
        sort: option.sortOrder * 1000 + value.sortOrder,
      });
    }
  }
  return map;
}

export function serializeVariantOptionValues(
  product: ExportProductRecord,
  variant: ExportProductRecord["variants"][number],
): string {
  const optionMap = buildOptionValueMap(product);
  const pairs = variant.optionValues
    .map((link) => optionMap.get(link.optionValueId))
    .filter((item): item is { group: string; label: string; sort: number } => Boolean(item))
    .sort((a, b) => a.sort - b.sort)
    .map((item) => `${item.group}=${item.label}`);
  return pairs.join(" | ");
}

function isStructuredVariant(
  product: ExportProductRecord,
  variant: ExportProductRecord["variants"][number],
): boolean {
  return variant.optionValues.length > 0 && product.options.length > 0;
}

export function mapProductToExportRow(product: ExportProductRecord): Record<string, string> {
  const row: Record<string, string> = {};
  for (const header of PRODUCT_IMPORT_HEADERS) {
    switch (header) {
      case "productCode":
        row[header] = sanitizeExportCell(product.productCode);
        break;
      case "systemCode":
        row[header] = sanitizeExportCell(product.systemCode);
        break;
      case "name":
        row[header] = sanitizeExportCell(product.name);
        break;
      case "slug":
        row[header] = sanitizeExportCell(product.slug);
        break;
      case "categorySlug":
        row[header] = sanitizeExportCell(product.category.slug);
        break;
      case "shortDescription":
        row[header] = sanitizeExportCell(product.shortDescription);
        break;
      case "description":
        row[header] = sanitizeExportCell(product.description);
        break;
      case "material":
        row[header] = sanitizeExportCell(product.material);
        break;
      case "form":
        row[header] = sanitizeExportCell(product.form);
        break;
      case "fit":
        row[header] = sanitizeExportCell(product.fit);
        break;
      case "gsm":
        row[header] = sanitizeExportCell(product.gsm);
        break;
      case "defaultMoq":
        row[header] = sanitizeExportCell(product.defaultMoq);
        break;
      case "leadTime":
        row[header] = sanitizeExportCell(product.leadTime);
        break;
      case "supportsPrinting":
        row[header] = sanitizeExportCell(product.supportsPrinting);
        break;
      case "supportsEmbroidery":
        row[header] = sanitizeExportCell(product.supportsEmbroidery);
        break;
      case "supportsOem":
        row[header] = sanitizeExportCell(product.supportsOem);
        break;
      case "tags":
        row[header] = sanitizeExportCell((product.tags ?? []).join(", "));
        break;
      case "featuredImageUrl":
        row[header] = sanitizeExportCell(product.featuredImage);
        break;
      case "galleryUrls":
        row[header] = sanitizeExportCell((product.gallery ?? []).join("|"));
        break;
      case "status":
        row[header] = sanitizeExportCell(product.status);
        break;
      case "seoTitle":
        row[header] = sanitizeExportCell(product.seoTitle);
        break;
      case "seoDescription":
        row[header] = sanitizeExportCell(product.seoDescription);
        break;
      default:
        row[header] = "";
    }
  }
  return row;
}

function decimalToString(value: unknown): string {
  if (value == null) return "";
  if (
    typeof value === "object" &&
    value &&
    "toNumber" in value &&
    typeof (value as { toNumber: () => number }).toNumber === "function"
  ) {
    return String((value as { toNumber: () => number }).toNumber());
  }
  return String(value);
}

export function mapVariantToExportRow(
  product: ExportProductRecord,
  variant: ExportProductRecord["variants"][number],
  options: ProductExportOptions,
): Record<string, string> {
  const structured = isStructuredVariant(product, variant);
  const optionValues = structured ? serializeVariantOptionValues(product, variant) : "";

  const row: Record<string, string> = {};
  for (const header of VARIANT_IMPORT_HEADERS) {
    switch (header) {
      case "productCode":
        row[header] = sanitizeExportCell(product.productCode);
        break;
      case "sku":
        row[header] = sanitizeExportCell(variant.sku);
        break;
      case "displayLabel":
        row[header] = sanitizeExportCell(variant.displayLabel);
        break;
      case "optionValues":
        row[header] = sanitizeExportCell(optionValues);
        break;
      case "colorName":
        row[header] = structured ? "" : sanitizeExportCell(variant.colorName);
        break;
      case "colorCode":
        row[header] = structured ? "" : sanitizeExportCell(variant.colorCode);
        break;
      case "sizeName":
        row[header] = structured ? "" : sanitizeExportCell(variant.sizeName);
        break;
      case "materialOverride":
        row[header] = sanitizeExportCell(variant.materialOverride);
        break;
      case "stockQty":
        row[header] = sanitizeExportCell(variant.stockQty);
        break;
      case "stockStatus":
        row[header] = sanitizeExportCell(variant.stockStatus);
        break;
      case "moqOverride":
        row[header] = sanitizeExportCell(variant.moqOverride);
        break;
      case "leadTimeOverride":
        row[header] = sanitizeExportCell(variant.leadTimeOverride);
        break;
      case "imageUrl":
        row[header] = sanitizeExportCell(variant.imageUrl);
        break;
      case "variantStatus":
        row[header] = sanitizeExportCell(variant.variantStatus);
        break;
      case "wholesalePrice":
        row[header] = options.includeWholesalePrice
          ? sanitizeExportCell(decimalToString(variant.wholesalePrice))
          : "";
        break;
      case "dealerPrice":
        row[header] = options.includeDealerPrice
          ? sanitizeExportCell(decimalToString(variant.dealerPrice))
          : "";
        break;
      default:
        row[header] = "";
    }
  }
  return row;
}

export function mapSpecToExportRow(
  product: ExportProductRecord,
  spec: ExportProductRecord["specifications"][number],
): Record<string, string> {
  return {
    productCode: sanitizeExportCell(product.productCode),
    group: "",
    label: sanitizeExportCell(spec.label),
    value: sanitizeExportCell(spec.value),
    sortOrder: sanitizeExportCell(spec.sortOrder),
  };
}

export function mapCustomizationToExportRow(
  product: ExportProductRecord,
  item: ExportProductRecord["customizationCapabilities"][number],
): Record<string, string> {
  return {
    productCode: sanitizeExportCell(product.productCode),
    capability: sanitizeExportCell(item.label),
    description: sanitizeExportCell(item.description),
    sortOrder: sanitizeExportCell(item.sortOrder),
    enabled: sanitizeExportCell(item.enabled),
  };
}

export function buildExportGuideRows(
  options: ProductExportOptions,
  meta: { productCount: number; variantCount: number; scopeLabel: string },
): Record<string, string>[] {
  const rows: Record<string, string>[] = [
    { muc: "Thời gian xuất", noiDung: new Date().toLocaleString("vi-VN") },
    { muc: "Phạm vi", noiDung: meta.scopeLabel },
    { muc: "Số sản phẩm", noiDung: String(meta.productCount) },
    { muc: "Số biến thể", noiDung: String(meta.variantCount) },
    {
      muc: "Chế độ nhập khuyến nghị",
      noiDung:
        "Cập nhật sản phẩm (sheet Sản phẩm) | Nhập biến thể (sheet Biến thể) | Cập nhật biến thể hàng loạt (tồn kho/SKU/MOQ/ảnh)",
    },
    { muc: "Ô trống", noiDung: "Ô trống giữ nguyên giá trị hiện có khi cập nhật." },
    { muc: "__CLEAR__", noiDung: "Nhập __CLEAR__ để xóa giá trị được hỗ trợ khi cập nhật." },
    { muc: "optionValues", noiDung: "Màu sắc=Đen | Kích thước=M" },
    { muc: "galleryUrls", noiDung: "URL1|URL2" },
    {
      muc: "variantStatus",
      noiDung: `ACTIVE=${VARIANT_STATUS_LABELS.ACTIVE}; INACTIVE=${VARIANT_STATUS_LABELS.INACTIVE}; ARCHIVED=${VARIANT_STATUS_LABELS.ARCHIVED}`,
    },
    {
      muc: "Tùy chọn xuất",
      noiDung: [
        options.includeWholesalePrice ? "có giá sỉ" : "không giá sỉ",
        options.includeDealerPrice ? "có giá đại lý" : "không giá đại lý",
        options.includeInactiveVariants ? "có BT ngừng/lưu trữ" : "chỉ BT đang bán",
        options.includeSpecifications ? "có thông số" : "không thông số",
        options.includeCustomizations ? "có tùy chỉnh" : "không tùy chỉnh",
      ].join("; "),
    },
  ];

  if (options.cloneTemplate) {
    rows.push(
      { muc: "Nhân bản sản phẩm", noiDung: "Đổi productCode, systemCode, name, slug trước khi nhập Tạo sản phẩm mới." },
      { muc: "SKU", noiDung: "SKU phải duy nhất toàn hệ thống." },
      { muc: "Tổ hợp thuộc tính", noiDung: "Giữ hoặc chỉnh optionValues có chủ đích — không trộn legacy color/size với optionValues." },
    );
  }

  return rows;
}

export function buildExportFileName(options: ProductExportOptions, suffix?: string): string {
  const date = new Date().toISOString().slice(0, 10);
  const base = suffix ? `attd-${suffix}-${date}` : `attd-san-pham-${date}`;
  return base;
}

export function sheetMetaForEntity(entity: "product" | "variant" | "specification" | "customization") {
  switch (entity) {
    case "product":
      return { sheetName: IMPORT_SHEET_NAMES.product, headers: PRODUCT_IMPORT_HEADERS };
    case "variant":
      return { sheetName: IMPORT_SHEET_NAMES.variant, headers: VARIANT_IMPORT_HEADERS };
    case "specification":
      return { sheetName: IMPORT_SHEET_NAMES.specification, headers: SPEC_IMPORT_HEADERS };
    case "customization":
      return { sheetName: IMPORT_SHEET_NAMES.customization, headers: CUSTOMIZATION_IMPORT_HEADERS };
  }
}

export function createCsvWithBom(headers: string[], rows: Record<string, string>[]): string {
  const lines = [headers.map(escapeCsvValue).join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escapeCsvValue(row[h] ?? "")).join(","));
  }
  return `\uFEFF${lines.join("\n")}`;
}
