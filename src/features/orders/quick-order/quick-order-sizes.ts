/** Canonical free-size value used by variant matrix / SKU helpers. */
export const QUICK_ORDER_FREE_SIZE_VALUE = "Free size";

export type QuickOrderSizeColumn = {
  key: string;
  label: string;
  isDefault: boolean;
};

export const DEFAULT_QUICK_ORDER_SIZE_COLUMNS: QuickOrderSizeColumn[] = [
  { key: "S", label: "S", isDefault: true },
  { key: "M", label: "M", isDefault: true },
  { key: "L", label: "L", isDefault: true },
  { key: "XL", label: "XL", isDefault: true },
  { key: "2XL", label: "2XL", isDefault: true },
  { key: "3XL", label: "3XL", isDefault: true },
  { key: "4XL", label: "4XL", isDefault: true },
  { key: "Free", label: "Free", isDefault: true },
];

export const DEFAULT_QUICK_ORDER_SIZE_KEYS = DEFAULT_QUICK_ORDER_SIZE_COLUMNS.map((c) => c.key);

const DEFAULT_KEY_BY_LABEL = new Map(
  DEFAULT_QUICK_ORDER_SIZE_COLUMNS.map((col) => [normalizeSizeComparisonKey(col.label), col.key]),
);

export function normalizeSizeComparisonKey(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, " ");
}

export function createStableSizeKey(label: string): string {
  const trimmed = label.trim();
  if (!trimmed) return "";
  const defaultKey = DEFAULT_KEY_BY_LABEL.get(normalizeSizeComparisonKey(trimmed));
  if (defaultKey) return defaultKey;
  const slug = normalizeSizeComparisonKey(trimmed).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `custom:${slug || "size"}`;
}

export function emptyQuickOrderSizeQuantities(
  columns: QuickOrderSizeColumn[] = DEFAULT_QUICK_ORDER_SIZE_COLUMNS,
): Record<string, number> {
  return Object.fromEntries(columns.map((col) => [col.key, 0]));
}

export function sumQuickOrderSizeQuantities(
  sizes: Record<string, number>,
  columns: QuickOrderSizeColumn[],
): number {
  return columns.reduce((sum, col) => sum + Math.max(0, Math.floor(sizes[col.key] || 0)), 0);
}

export function sizeColumnLabelToVariantSizeValue(column: Pick<QuickOrderSizeColumn, "key" | "label">): string {
  if (column.key === "Free" || normalizeSizeComparisonKey(column.label) === "free") {
    return QUICK_ORDER_FREE_SIZE_VALUE;
  }
  return column.label.trim();
}

export function normalizeSizeForStockMatch(sizeValue: string | null | undefined): string {
  const trimmed = (sizeValue ?? "").trim();
  if (!trimmed) return "";
  if (normalizeSizeComparisonKey(trimmed) === "free" || trimmed === QUICK_ORDER_FREE_SIZE_VALUE) {
    return QUICK_ORDER_FREE_SIZE_VALUE;
  }
  return trimmed;
}

export function findDuplicateSizeColumn(
  columns: QuickOrderSizeColumn[],
  label: string,
): QuickOrderSizeColumn | null {
  const comparison = normalizeSizeComparisonKey(label);
  if (!comparison) return null;
  return (
    columns.find((col) => normalizeSizeComparisonKey(col.label) === comparison) ?? null
  );
}

export function mergeImportedSizeColumns(
  existing: QuickOrderSizeColumn[],
  imported: QuickOrderSizeColumn[],
): QuickOrderSizeColumn[] {
  const merged = [...existing];
  for (const column of imported) {
    if (findDuplicateSizeColumn(merged, column.label)) continue;
    merged.push(column);
  }
  return merged;
}

export function ensureRowSizesForColumns(
  sizes: Record<string, number>,
  columns: QuickOrderSizeColumn[],
): Record<string, number> {
  const next = { ...sizes };
  for (const col of columns) {
    if (next[col.key] == null) next[col.key] = 0;
  }
  return next;
}

export function columnFromHeaderLabel(header: string): QuickOrderSizeColumn | null {
  const trimmed = header.trim();
  if (!trimmed) return null;
  const norm = normalizeSizeComparisonKey(trimmed);
  const defaultKey = DEFAULT_KEY_BY_LABEL.get(norm);
  if (defaultKey) {
    const existing = DEFAULT_QUICK_ORDER_SIZE_COLUMNS.find((col) => col.key === defaultKey);
    return existing ?? null;
  }
  return {
    key: createStableSizeKey(trimmed),
    label: trimmed,
    isDefault: false,
  };
}

export function migrateLegacyFixedSizes(
  legacy: Partial<Record<string, number>> | undefined,
  columns: QuickOrderSizeColumn[] = DEFAULT_QUICK_ORDER_SIZE_COLUMNS,
): Record<string, number> {
  const sizes = emptyQuickOrderSizeQuantities(columns);
  if (!legacy) return sizes;
  for (const col of columns) {
    const legacyValue = legacy[col.key as keyof typeof legacy];
    if (typeof legacyValue === "number") {
      sizes[col.key] = legacyValue;
    }
  }
  for (const [key, value] of Object.entries(legacy)) {
    if (typeof value !== "number") continue;
    const column = columns.find((col) => col.key === key);
    if (column) continue;
    const fromLabel = columnFromHeaderLabel(key);
    if (fromLabel && !findDuplicateSizeColumn(columns, fromLabel.label)) {
      sizes[fromLabel.key] = value;
    }
  }
  return sizes;
}

export function addSizeColumnFromLabel(
  columns: QuickOrderSizeColumn[],
  label: string,
): { columns: QuickOrderSizeColumn[]; error?: string } {
  const trimmed = label.trim();
  if (!trimmed) return { columns, error: "Vui lòng nhập tên size." };
  const duplicate = findDuplicateSizeColumn(columns, trimmed);
  if (duplicate) return { columns, error: "Size này đã tồn tại trong bảng." };
  const column = columnFromHeaderLabel(trimmed);
  if (!column) return { columns, error: "Tên size không hợp lệ." };
  return { columns: [...columns, column] };
}

export function removeSizeColumn(
  columns: QuickOrderSizeColumn[],
  key: string,
): QuickOrderSizeColumn[] {
  const column = columns.find((col) => col.key === key);
  if (!column || column.isDefault) return columns;
  return columns.filter((col) => col.key !== key);
}

export function columnHasQuantities(
  rows: Array<{ sizes: Record<string, number> }>,
  key: string,
): boolean {
  return rows.some((row) => Math.max(0, Math.floor(row.sizes[key] || 0)) > 0);
}

const KNOWN_FIELD_HEADERS = new Set([
  "mã dòng",
  "code",
  "sku",
  "sku khách",
  "mã dòng / sku khách",
  "sản phẩm",
  "product",
  "sản phẩm lấy từ",
  "nguồn hàng",
  "source",
  "cách xử lý",
  "xử lý",
  "processing",
  "nhóm doanh thu",
  "danh mục doanh thu",
  "revenue category",
  "màu",
  "color",
  "mô tả",
  "description",
  "mô tả / yêu cầu kỹ thuật",
  "đơn vị",
  "unit",
  "đơn giá",
  "price",
  "giá",
  "tổng sl",
  "tổng số lượng",
  "thành tiền",
  "stt",
]);

export function isOperationalHeader(header: string): boolean {
  return KNOWN_FIELD_HEADERS.has(normalizeSizeComparisonKey(header));
}

export function detectSizeColumnsFromHeaders(headers: string[]): QuickOrderSizeColumn[] {
  const detected: QuickOrderSizeColumn[] = [];
  for (const header of headers) {
    const trimmed = header.trim();
    if (!trimmed || isOperationalHeader(trimmed)) continue;
    const column = columnFromHeaderLabel(trimmed);
    if (!column) continue;
    if (findDuplicateSizeColumn(detected, column.label)) continue;
    detected.push(column);
  }
  return detected;
}

export function buildSizeColumnsFromImportHeaders(headers: string[]): QuickOrderSizeColumn[] {
  const columns: QuickOrderSizeColumn[] = [];
  for (const header of headers) {
    const trimmed = header.trim();
    if (!trimmed || isOperationalHeader(trimmed)) continue;
    const column = columnFromHeaderLabel(trimmed);
    if (!column || findDuplicateSizeColumn(columns, column.label)) continue;
    columns.push(column);
  }
  for (const def of DEFAULT_QUICK_ORDER_SIZE_COLUMNS) {
    if (!findDuplicateSizeColumn(columns, def.label)) {
      columns.push(def);
    }
  }
  return columns.length ? columns : [...DEFAULT_QUICK_ORDER_SIZE_COLUMNS];
}

export function mergeSizeColumnsWithDefaults(imported: QuickOrderSizeColumn[]): QuickOrderSizeColumn[] {
  return mergeImportedSizeColumns(DEFAULT_QUICK_ORDER_SIZE_COLUMNS, imported);
}
