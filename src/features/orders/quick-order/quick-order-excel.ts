import * as XLSX from "xlsx";
import type { OrderItemProcessingMethod, OrderItemSupplySource } from "@prisma/client";
import { normalizeRevenueCategoryLookup } from "@/features/revenue-categories/revenue-category-display";
import type { RevenueCategoryPickerOption } from "@/features/revenue-categories/revenue-category.service";
import {
  sanitizeQuickOrderColorCode,
  sanitizeQuickOrderColorName,
} from "@/features/orders/quick-order/quick-order-color";
import {
  buildSizeColumnsFromImportHeaders,
  columnFromHeaderLabel,
  DEFAULT_QUICK_ORDER_SIZE_COLUMNS,
  emptyQuickOrderSizeQuantities,
  ensureRowSizesForColumns,
  findDuplicateSizeColumn,
  isOperationalHeader,
  type QuickOrderSizeColumn,
} from "@/features/orders/quick-order/quick-order-sizes";
import {
  createEmptyQuickOrderRow,
  type QuickOrderGridRow,
} from "@/features/orders/quick-order/quick-order.types";
import {
  ORDER_ITEM_PROCESSING_METHOD_LABELS,
  ORDER_ITEM_SUPPLY_SOURCE_LABELS,
} from "@/features/orders/order-item-classification";

export const QUICK_ORDER_TEMPLATE_HEADERS = [
  "Mã dòng / SKU khách",
  "Sản phẩm",
  "Sản phẩm lấy từ",
  "Cách xử lý",
  "Nhóm doanh thu",
  "Màu",
  "Mô tả / yêu cầu kỹ thuật",
  ...DEFAULT_QUICK_ORDER_SIZE_COLUMNS.map((col) => col.label),
  "Đơn vị",
  "Đơn giá",
] as const;

const HEADER_ALIASES: Record<string, keyof ParsedQuickRow> = {
  "mã dòng": "lineCode",
  code: "lineCode",
  sku: "lineCode",
  "sku khách": "lineCode",
  "mã dòng / sku khách": "lineCode",
  "sản phẩm": "productName",
  product: "productName",
  "sản phẩm lấy từ": "supplySource",
  "nguồn hàng": "supplySource",
  source: "supplySource",
  "cách xử lý": "processingMethod",
  "xử lý": "processingMethod",
  processing: "processingMethod",
  "nhóm doanh thu": "revenueCategory",
  "danh mục doanh thu": "revenueCategory",
  "revenue category": "revenueCategory",
  màu: "colorName",
  color: "colorName",
  "mô tả": "description",
  description: "description",
  "mô tả / yêu cầu kỹ thuật": "description",
  "đơn vị": "unit",
  unit: "unit",
  "đơn giá": "unitPrice",
  price: "unitPrice",
  giá: "unitPrice",
};

type ParsedQuickRow = {
  lineCode: string;
  productName: string;
  supplySource: string;
  processingMethod: string;
  revenueCategory: string;
  colorName: string;
  colorCode: string;
  description: string;
  unit: string;
  unitPrice: string;
};

type ColumnMapping =
  | { type: "field"; key: keyof ParsedQuickRow }
  | { type: "size"; column: QuickOrderSizeColumn }
  | { type: "skip" };

export type QuickOrderImportSummary = {
  importedCount: number;
  unresolvedProductCount: number;
  unresolvedRevenueCategoryCount: number;
  invalidQuantityCount: number;
  rows: QuickOrderGridRow[];
  sizeColumns: QuickOrderSizeColumn[];
  message?: string;
};

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase();
}

function parseSupplySourceLabel(value: string): OrderItemSupplySource | null {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  const entry = Object.entries(ORDER_ITEM_SUPPLY_SOURCE_LABELS).find(
    ([, label]) => label.toLowerCase() === normalized,
  );
  if (entry) return entry[0] as OrderItemSupplySource;
  if (normalized in ORDER_ITEM_SUPPLY_SOURCE_LABELS) {
    return normalized.toUpperCase() as OrderItemSupplySource;
  }
  return null;
}

function parseProcessingMethodLabel(value: string): OrderItemProcessingMethod | null {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  const entry = Object.entries(ORDER_ITEM_PROCESSING_METHOD_LABELS).find(
    ([, label]) => label.toLowerCase() === normalized,
  );
  if (entry) return entry[0] as OrderItemProcessingMethod;
  if (normalized in ORDER_ITEM_PROCESSING_METHOD_LABELS) {
    return normalized.toUpperCase() as OrderItemProcessingMethod;
  }
  return null;
}

function parseQuantityCell(value: string): number {
  const trimmed = value.trim();
  if (!trimmed) return 0;
  const n = Number(trimmed.replace(/,/g, ""));
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : -1;
}

type ProductLookup = {
  id: string;
  name: string;
  productCode: string | null;
  colors: Array<{ id: string; name: string }>;
  hasStockVariants: boolean;
};

function normalizeLookup(value: string): string {
  return value.trim().toLowerCase();
}

function resolveProduct(value: string, products: ProductLookup[]): ProductLookup | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const byCode = products.find(
    (p) => p.productCode && normalizeLookup(p.productCode) === normalizeLookup(trimmed),
  );
  if (byCode) return byCode;
  const exactName = products.filter((p) => normalizeLookup(p.name) === normalizeLookup(trimmed));
  if (exactName.length === 1) return exactName[0]!;
  return null;
}

function resolveColor(product: ProductLookup | null, colorName: string, supplySource: OrderItemSupplySource | null) {
  const trimmed = colorName.trim();
  if (!trimmed) {
    return { colorId: null, colorName: "", colorCode: "", isCustomColor: false };
  }

  if (product && supplySource === "ATTD_STOCK") {
    const match = product.colors.find(
      (color) => normalizeLookup(color.name) === normalizeLookup(trimmed),
    );
    if (match && !match.id.startsWith("name:")) {
      return { colorId: match.id, colorName: match.name, colorCode: "", isCustomColor: false };
    }
    return { colorId: null, colorName: trimmed, colorCode: "", isCustomColor: false };
  }

  if (product) {
    const match = product.colors.find(
      (color) => normalizeLookup(color.name) === normalizeLookup(trimmed),
    );
    if (match && !match.id.startsWith("name:")) {
      return { colorId: match.id, colorName: match.name, colorCode: "", isCustomColor: false };
    }
  }

  const sanitizedName = sanitizeQuickOrderColorName(trimmed);
  return {
    colorId: null,
    colorName: sanitizedName,
    colorCode: "",
    isCustomColor: true,
  };
}

function buildColumnMappingsFromHeaders(headers: string[]): {
  mappings: ColumnMapping[];
  sizeColumns: QuickOrderSizeColumn[];
} {
  const rawHeaders = headers.map((h) => h.trim()).filter(Boolean);
  const sizeColumns = buildSizeColumnsFromImportHeaders(rawHeaders);

  const mappings: ColumnMapping[] = headers.map((cell) => {
    const normalized = normalizeHeader(cell);
    const fieldKey = HEADER_ALIASES[normalized];
    if (fieldKey) return { type: "field", key: fieldKey };
    if (!cell.trim() || isOperationalHeader(cell)) {
      return { type: "skip" };
    }
    const sizeColumn = columnFromHeaderLabel(cell);
    if (sizeColumn) {
      const merged = findDuplicateSizeColumn(sizeColumns, sizeColumn.label) ?? sizeColumn;
      return { type: "size", column: merged };
    }
    return { type: "skip" };
  });

  return { mappings, sizeColumns };
}

export function parseQuickOrderClipboard(
  text: string,
  products: ProductLookup[],
): QuickOrderImportSummary {
  const lines = text
    .trim()
    .split(/\r?\n/)
    .map((line) => line.split("\t"))
    .filter((cells) => cells.some((cell) => cell.trim()));
  if (!lines.length) {
    return emptyImportSummary("File không có dữ liệu hợp lệ.");
  }

  const headerCells = lines[0]!.map((cell) => cell.trim());
  const hasHeader = headerCells.some((cell) => HEADER_ALIASES[normalizeHeader(cell)] != null || columnFromHeaderLabel(cell));
  const dataLines = hasHeader ? lines.slice(1) : lines;

  const { mappings, sizeColumns } = hasHeader
    ? buildColumnMappingsFromHeaders(headerCells)
    : {
        mappings: QUICK_ORDER_TEMPLATE_HEADERS.map((header) => {
          const alias = HEADER_ALIASES[normalizeHeader(header)];
          if (alias) return { type: "field" as const, key: alias };
          const sizeColumn = columnFromHeaderLabel(header);
          if (sizeColumn) return { type: "size" as const, column: sizeColumn };
          return { type: "field" as const, key: "lineCode" as const };
        }),
        sizeColumns: [...DEFAULT_QUICK_ORDER_SIZE_COLUMNS],
      };

  return buildRowsFromMatrix(dataLines, mappings, sizeColumns, products);
}

export function parseQuickOrderWorkbook(
  buffer: ArrayBuffer,
  products: ProductLookup[],
): QuickOrderImportSummary {
  try {
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return emptyImportSummary("File không có dữ liệu hợp lệ.");
    }
    const sheet = workbook.Sheets[sheetName];
    const matrix = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: "" }) as string[][];
    const nonEmpty = matrix.filter((row) => row.some((cell) => String(cell).trim()));
    if (!nonEmpty.length) return emptyImportSummary("File không có dữ liệu hợp lệ.");

    const headerCells = nonEmpty[0]!.map((cell) => String(cell).trim());
    const hasHeader = headerCells.some(
      (cell) => HEADER_ALIASES[normalizeHeader(cell)] != null || columnFromHeaderLabel(cell),
    );
    const dataLines = (hasHeader ? nonEmpty.slice(1) : nonEmpty).map((row) =>
      row.map((cell) => String(cell)),
    );

    const { mappings, sizeColumns } = hasHeader
      ? buildColumnMappingsFromHeaders(headerCells)
      : {
          mappings: QUICK_ORDER_TEMPLATE_HEADERS.map((header) => {
            const alias = HEADER_ALIASES[normalizeHeader(header)];
            if (alias) return { type: "field" as const, key: alias };
            const sizeColumn = columnFromHeaderLabel(header);
            if (sizeColumn) return { type: "size" as const, column: sizeColumn };
            return { type: "field" as const, key: "lineCode" as const };
          }),
          sizeColumns: [...DEFAULT_QUICK_ORDER_SIZE_COLUMNS],
        };

    return buildRowsFromMatrix(dataLines, mappings, sizeColumns, products);
  } catch {
    return emptyImportSummary("Không đọc được file Excel.");
  }
}

function emptyImportSummary(message: string): QuickOrderImportSummary {
  return {
    importedCount: 0,
    unresolvedProductCount: 0,
    unresolvedRevenueCategoryCount: 0,
    invalidQuantityCount: 0,
    rows: [],
    sizeColumns: [...DEFAULT_QUICK_ORDER_SIZE_COLUMNS],
    message,
  };
}

function buildRowsFromMatrix(
  dataLines: string[][],
  columnMap: ColumnMapping[],
  sizeColumns: QuickOrderSizeColumn[],
  products: ProductLookup[],
): QuickOrderImportSummary {
  const rows: QuickOrderGridRow[] = [];
  let unresolvedProductCount = 0;
  let unresolvedRevenueCategoryCount = 0;
  let invalidQuantityCount = 0;

  for (const [index, cells] of dataLines.entries()) {
    const parsed: ParsedQuickRow = {
      lineCode: "",
      productName: "",
      supplySource: "",
      processingMethod: "",
      revenueCategory: "",
      colorName: "",
      colorCode: "",
      description: "",
      unit: "cái",
      unitPrice: "",
    };
    const sizes = emptyQuickOrderSizeQuantities(sizeColumns);

    columnMap.forEach((mapping, colIndex) => {
      const raw = (cells[colIndex] ?? "").trim();
      if (mapping.type === "skip") return;
      if (mapping.type === "size") {
        const qty = parseQuantityCell(raw);
        if (qty < 0) invalidQuantityCount += 1;
        sizes[mapping.column.key] = Math.max(0, qty);
        return;
      }
      parsed[mapping.key] = raw;
    });

    if (!parsed.productName.trim() && !Object.values(sizes).some((qty) => qty > 0)) continue;

    const product = resolveProduct(parsed.productName, products);
    if (parsed.productName.trim() && !product) unresolvedProductCount += 1;

    const supplySource =
      parseSupplySourceLabel(parsed.supplySource) ??
      (product?.hasStockVariants ? "ATTD_STOCK" : null);

    const color = resolveColor(product, parsed.colorName, supplySource);

    const row = createEmptyQuickOrderRow(index + 1, sizeColumns);
    row.lineCode = parsed.lineCode;
    row.productId = product?.id ?? null;
    row.productName = product?.name ?? parsed.productName;
    row.supplySource = supplySource;
    row.processingMethod = parseProcessingMethodLabel(parsed.processingMethod) ?? "AS_IS";
    row.colorId = color.colorId;
    row.colorName = color.colorName;
    row.colorCode = color.colorCode || sanitizeQuickOrderColorCode(parsed.colorCode);
    row.isCustomColor = color.isCustomColor;
    row.description = parsed.description;
    row.sizes = ensureRowSizesForColumns(sizes, sizeColumns);
    row.unit = parsed.unit.trim() || "cái";
    row.unitPrice = Number(parsed.unitPrice.replace(/,/g, "")) || 0;
    row.importWarnings = [];
    if (!product && parsed.productName.trim()) {
      row.importWarnings.push("Một số dòng cần chọn lại sản phẩm hoặc màu sắc.");
    }
    if (parsed.revenueCategory.trim()) {
      row.importWarnings?.push(`RC:${parsed.revenueCategory}`);
    } else {
      unresolvedRevenueCategoryCount += 1;
    }
    rows.push(row);
  }

  return {
    importedCount: rows.length,
    unresolvedProductCount,
    unresolvedRevenueCategoryCount,
    invalidQuantityCount,
    rows,
    sizeColumns,
  };
}

export function resolveRevenueCategoryFromList(
  value: string,
  options: RevenueCategoryPickerOption[],
): RevenueCategoryPickerOption | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const byCode = options.find(
    (item) => item.code.toLowerCase() === trimmed.toLowerCase(),
  );
  if (byCode) return byCode;

  if (trimmed.includes(">")) {
    const normalized = normalizeRevenueCategoryLookup(trimmed);
    const byPath = options.filter(
      (item) => normalizeRevenueCategoryLookup(item.displayPath) === normalized,
    );
    if (byPath.length === 1) return byPath[0]!;
    return null;
  }

  const byName = options.filter(
    (item) => item.name.toLowerCase() === trimmed.toLowerCase(),
  );
  if (byName.length === 1) return byName[0]!;
  return null;
}

export function applyRevenueCategoriesToImportedRows(
  rows: QuickOrderGridRow[],
  options: RevenueCategoryPickerOption[],
): QuickOrderGridRow[] {
  return rows.map((row) => {
    const warning = row.importWarnings?.find((item) => item.startsWith("RC:"));
    const lookupValue = warning?.slice(3) ?? "";
    const cleanedWarnings = row.importWarnings?.filter((item) => !item.startsWith("RC:")) ?? [];
    let revenueCategoryId = row.revenueCategoryId;
    if (lookupValue) {
      const resolved = resolveRevenueCategoryFromList(lookupValue, options);
      if (resolved) revenueCategoryId = resolved.id;
      else cleanedWarnings.push("Một số dòng cần chọn lại nhóm doanh thu.");
    }
    return { ...row, revenueCategoryId, importWarnings: cleanedWarnings };
  });
}

export function downloadQuickOrderTemplate(): void {
  const instruction =
    "Có thể thêm cột size mới như XS, 5XL, 28 hoặc size riêng của khách.";
  const ws = XLSX.utils.aoa_to_sheet([
    Array.from(QUICK_ORDER_TEMPLATE_HEADERS),
    [instruction],
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "NhapDonNhanh");
  const guide = XLSX.utils.aoa_to_sheet([
    ["Hướng dẫn nhập đơn nhanh"],
    [instruction],
    ["Các cột size mặc định: S, M, L, XL, 2XL, 3XL, 4XL, Free"],
    ["Thêm cột size tùy ý ở giữa mô tả và đơn vị — hệ thống sẽ nhận diện khi import."],
  ]);
  XLSX.utils.book_append_sheet(wb, guide, "HuongDan");
  XLSX.writeFile(wb, "mau-nhap-don-nhanh.xlsx");
}
