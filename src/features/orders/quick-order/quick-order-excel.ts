import * as XLSX from "xlsx";
import type { OrderItemProcessingMethod, OrderItemSupplySource } from "@prisma/client";
import { normalizeRevenueCategoryLookup } from "@/features/revenue-categories/revenue-category-display";
import type { RevenueCategoryPickerOption } from "@/features/revenue-categories/revenue-category.service";
import {
  createEmptyQuickOrderRow,
  emptyQuickOrderSizes,
  QUICK_ORDER_SIZE_KEYS,
  type QuickOrderGridRow,
  type QuickOrderSizeKey,
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
  ...QUICK_ORDER_SIZE_KEYS,
  "Đơn vị",
  "Đơn giá",
] as const;

const HEADER_ALIASES: Record<string, keyof ParsedQuickRow | QuickOrderSizeKey> = {
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
  s: "S",
  m: "M",
  l: "L",
  xl: "XL",
  "2xl": "2XL",
  "3xl": "3XL",
  "4xl": "4XL",
  free: "Free",
};

type ParsedQuickRow = {
  lineCode: string;
  productName: string;
  supplySource: string;
  processingMethod: string;
  revenueCategory: string;
  colorName: string;
  description: string;
  unit: string;
  unitPrice: string;
};

export type QuickOrderImportSummary = {
  importedCount: number;
  unresolvedProductCount: number;
  unresolvedRevenueCategoryCount: number;
  invalidQuantityCount: number;
  rows: QuickOrderGridRow[];
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

function resolveColor(product: ProductLookup | null, colorName: string) {
  if (!product || !colorName.trim()) return { colorId: null, colorName: colorName.trim() };
  const match = product.colors.find(
    (color) => normalizeLookup(color.name) === normalizeLookup(colorName),
  );
  if (match) return { colorId: match.id, colorName: match.name };
  return { colorId: null, colorName: "Chưa xác định màu" };
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
    return {
      importedCount: 0,
      unresolvedProductCount: 0,
      unresolvedRevenueCategoryCount: 0,
      invalidQuantityCount: 0,
      rows: [],
      message: "File không có dữ liệu hợp lệ.",
    };
  }

  const headerCells = lines[0]!.map(normalizeHeader);
  const hasHeader = headerCells.some((cell) => HEADER_ALIASES[cell]);
  const dataLines = hasHeader ? lines.slice(1) : lines;
  const columnMap = hasHeader
    ? headerCells.map((cell) => HEADER_ALIASES[cell] ?? null)
    : QUICK_ORDER_TEMPLATE_HEADERS.map((header, index) => {
        const alias = HEADER_ALIASES[normalizeHeader(header)];
        return alias ?? null;
      });

  return buildRowsFromMatrix(dataLines, columnMap, products);
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

    const headerCells = nonEmpty[0]!.map((cell) => normalizeHeader(String(cell)));
    const hasHeader = headerCells.some((cell) => HEADER_ALIASES[cell]);
    const dataLines = (hasHeader ? nonEmpty.slice(1) : nonEmpty).map((row) =>
      row.map((cell) => String(cell)),
    );
    const columnMap = hasHeader
      ? headerCells.map((cell) => HEADER_ALIASES[cell] ?? null)
      : QUICK_ORDER_TEMPLATE_HEADERS.map((header) => HEADER_ALIASES[normalizeHeader(header)] ?? null);

    return buildRowsFromMatrix(dataLines, columnMap, products);
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
    message,
  };
}

function buildRowsFromMatrix(
  dataLines: string[][],
  columnMap: Array<keyof ParsedQuickRow | QuickOrderSizeKey | null>,
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
      description: "",
      unit: "cái",
      unitPrice: "",
    };
    const sizes = emptyQuickOrderSizes();

    columnMap.forEach((key, colIndex) => {
      if (!key) return;
      const raw = (cells[colIndex] ?? "").trim();
      if (QUICK_ORDER_SIZE_KEYS.includes(key as QuickOrderSizeKey)) {
        const qty = parseQuantityCell(raw);
        if (qty < 0) invalidQuantityCount += 1;
        sizes[key as QuickOrderSizeKey] = Math.max(0, qty);
        return;
      }
      parsed[key as keyof ParsedQuickRow] = raw;
    });

    if (!parsed.productName.trim() && !Object.values(sizes).some((qty) => qty > 0)) continue;

    const product = resolveProduct(parsed.productName, products);
    if (parsed.productName.trim() && !product) unresolvedProductCount += 1;
    const color = resolveColor(product, parsed.colorName);

    const row = createEmptyQuickOrderRow(index + 1);
    row.lineCode = parsed.lineCode;
    row.productId = product?.id ?? null;
    row.productName = product?.name ?? parsed.productName;
    row.supplySource =
      parseSupplySourceLabel(parsed.supplySource) ??
      (product?.hasStockVariants ? "ATTD_STOCK" : null);
    row.processingMethod = parseProcessingMethodLabel(parsed.processingMethod) ?? "AS_IS";
    row.colorId = color.colorId;
    row.colorName = color.colorName;
    row.description = parsed.description;
    row.sizes = sizes;
    row.unit = parsed.unit.trim() || "cái";
    row.unitPrice = Number(parsed.unitPrice.replace(/,/g, "")) || 0;
    row.importWarnings = [];
    if (!product && parsed.productName.trim()) {
      row.importWarnings.push("Một số dòng cần chọn lại sản phẩm hoặc màu sắc.");
    }
    if (parsed.revenueCategory.trim()) {
      // Revenue category resolved asynchronously in UI layer when applying import.
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
  const ws = XLSX.utils.aoa_to_sheet([Array.from(QUICK_ORDER_TEMPLATE_HEADERS)]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "NhapDonNhanh");
  XLSX.writeFile(wb, "mau-nhap-don-nhanh.xlsx");
}
