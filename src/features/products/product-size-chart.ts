/**
 * Product-specific public size chart stored in Product.metadata.publicSizeChart
 * (no schema migration).
 */

export const METADATA_PUBLIC_SIZE_CHART_KEY = "publicSizeChart";

export const DEFAULT_SIZE_CHART_TITLE = "Bảng size";

export const TEE_SHIRT_SIZE_CHART_COLUMNS: Array<{ id: string; label: string }> = [
  { id: "chest", label: "Ngang ngực" },
  { id: "length", label: "Dài áo" },
  { id: "shoulder", label: "Rộng vai" },
  { id: "sleeve", label: "Dài tay" },
];

export type ProductSizeChartUnit = "cm" | "inch";

export type ProductSizeChartColumn = {
  id: string;
  label: string;
};

export type ProductSizeChartRow = {
  id: string;
  size: string;
  values: Record<string, string>;
};

export type ProductSizeChart = {
  enabled: boolean;
  unit: ProductSizeChartUnit;
  title?: string;
  note?: string;
  columns: ProductSizeChartColumn[];
  rows: ProductSizeChartRow[];
};

export type SizeOptionSource = {
  name?: string | null;
  slug?: string | null;
  values?: Array<{ label?: string | null; sortOrder?: number | null }>;
};

export type LegacySizeVariantSource = {
  sizeName?: string | null;
};

function newClientId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function trimString(value: unknown): string {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

function normalizeUnit(value: unknown): ProductSizeChartUnit {
  return value === "inch" ? "inch" : "cm";
}

function normalizeColumns(raw: unknown): ProductSizeChartColumn[] {
  if (!Array.isArray(raw)) return [];
  const columns: ProductSizeChartColumn[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const row = asRecord(item);
    if (!row) continue;
    const label = trimString(row.label);
    if (!label) continue;
    let id = trimString(row.id) || newClientId("col");
    if (seen.has(id)) id = newClientId("col");
    seen.add(id);
    columns.push({ id, label });
  }
  return columns;
}

function normalizeRows(raw: unknown, columns: ProductSizeChartColumn[]): ProductSizeChartRow[] {
  if (!Array.isArray(raw)) return [];
  const columnIds = columns.map((column) => column.id);
  const rows: ProductSizeChartRow[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const row = asRecord(item);
    if (!row) continue;
    const size = trimString(row.size);
    if (!size) continue;
    let id = trimString(row.id) || newClientId("row");
    if (seen.has(id)) id = newClientId("row");
    seen.add(id);
    const valuesRaw = asRecord(row.values) ?? {};
    const values: Record<string, string> = {};
    for (const columnId of columnIds) {
      const cell = valuesRaw[columnId];
      values[columnId] = trimString(cell);
    }
    rows.push({ id, size, values });
  }
  return rows;
}

/** Empty editable chart for admin forms. */
export function createEmptyProductSizeChart(): ProductSizeChart {
  return {
    enabled: false,
    unit: "cm",
    title: DEFAULT_SIZE_CHART_TITLE,
    note: "",
    columns: [],
    rows: [],
  };
}

/**
 * Normalize unknown metadata payload into a safe ProductSizeChart.
 * Invalid / missing data becomes an empty disabled chart.
 */
export function normalizeProductSizeChart(raw: unknown): ProductSizeChart {
  const record = asRecord(raw);
  if (!record) return createEmptyProductSizeChart();

  const columns = normalizeColumns(record.columns);
  const rows = normalizeRows(record.rows, columns);
  const title = trimString(record.title);
  const note = trimString(record.note);

  return {
    enabled: Boolean(record.enabled),
    unit: normalizeUnit(record.unit),
    title: title || DEFAULT_SIZE_CHART_TITLE,
    note: note || undefined,
    columns,
    rows,
  };
}

export function parsePublicSizeChartFromMetadata(metadata: unknown): ProductSizeChart {
  const record = asRecord(metadata);
  if (!record) return createEmptyProductSizeChart();
  return normalizeProductSizeChart(record[METADATA_PUBLIC_SIZE_CHART_KEY]);
}

/** True when chart should render on public PDP. */
export function isPublicSizeChartRenderable(chart: ProductSizeChart | null | undefined): boolean {
  if (!chart?.enabled) return false;
  return chart.columns.length > 0 && chart.rows.length > 0;
}

/**
 * Soft validation for enabled charts.
 * Returns null when OK / disabled; Vietnamese message when incomplete.
 */
export function validateProductSizeChartForSave(
  chart: ProductSizeChart | null | undefined,
): string | null {
  if (!chart || !chart.enabled) return null;
  if (chart.columns.length === 0 || chart.rows.length === 0) {
    return "Bảng size đang bật: cần ít nhất 1 cột đo và 1 hàng size.";
  }
  return null;
}

export function serializeProductSizeChartForMetadata(
  chart: ProductSizeChart,
): ProductSizeChart | null {
  const normalized = normalizeProductSizeChart(chart);
  const isEmpty =
    !normalized.enabled &&
    normalized.columns.length === 0 &&
    normalized.rows.length === 0 &&
    !normalized.note &&
    (!normalized.title || normalized.title === DEFAULT_SIZE_CHART_TITLE);
  if (isEmpty) return null;
  return {
    enabled: normalized.enabled,
    unit: normalized.unit,
    title: normalized.title || DEFAULT_SIZE_CHART_TITLE,
    ...(normalized.note ? { note: normalized.note } : {}),
    columns: normalized.columns,
    rows: normalized.rows,
  };
}

export function mergePublicSizeChartIntoMetadata(
  existingMetadata: unknown,
  chart: ProductSizeChart | null,
): Record<string, unknown> {
  const base =
    existingMetadata && typeof existingMetadata === "object" && !Array.isArray(existingMetadata)
      ? { ...(existingMetadata as Record<string, unknown>) }
      : {};
  const serialized = chart ? serializeProductSizeChartForMetadata(chart) : null;
  if (!serialized) {
    delete base[METADATA_PUBLIC_SIZE_CHART_KEY];
  } else {
    base[METADATA_PUBLIC_SIZE_CHART_KEY] = serialized;
  }
  return base;
}

export function isSizeOptionGroup(option: SizeOptionSource): boolean {
  const slug = trimString(option.slug).toLowerCase();
  const name = trimString(option.name).toLowerCase();
  const nameNormalized = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
  if (slug.includes("size") || slug.includes("kich")) return true;
  if (nameNormalized.includes("kich thuoc") || nameNormalized.includes("size")) return true;
  return false;
}

/**
 * Build size-chart rows from option groups / legacy variant size names.
 * Dedupes by size label (case-insensitive), keeps first-seen order.
 */
export function buildSizeChartRowsFromVariantSizes(input: {
  options?: SizeOptionSource[];
  variants?: LegacySizeVariantSource[];
  existingColumns?: ProductSizeChartColumn[];
}): ProductSizeChartRow[] {
  const sizes: string[] = [];
  const seen = new Set<string>();

  const pushSize = (label: string) => {
    const trimmed = label.trim();
    if (!trimmed) return;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    sizes.push(trimmed);
  };

  const sizeGroups = (input.options ?? [])
    .filter(isSizeOptionGroup)
    .map((group) => ({
      ...group,
      values: [...(group.values ?? [])].sort(
        (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
      ),
    }));

  for (const group of sizeGroups) {
    for (const value of group.values ?? []) {
      pushSize(trimString(value.label));
    }
  }

  if (sizes.length === 0) {
    for (const variant of input.variants ?? []) {
      pushSize(trimString(variant.sizeName));
    }
  }

  const columnIds = (input.existingColumns ?? []).map((column) => column.id);
  return sizes.map((size) => {
    const values: Record<string, string> = {};
    for (const columnId of columnIds) values[columnId] = "";
    return {
      id: newClientId("row"),
      size,
      values,
    };
  });
}

export function applyTeeShirtSizeChartColumns(
  chart: ProductSizeChart,
): ProductSizeChart {
  const existingById = new Map(chart.columns.map((column) => [column.id, column]));
  const columns = TEE_SHIRT_SIZE_CHART_COLUMNS.map((preset) => {
    const existing = existingById.get(preset.id);
    return existing ?? { ...preset };
  });
  const columnIds = columns.map((column) => column.id);
  const rows = chart.rows.map((row) => {
    const values: Record<string, string> = {};
    for (const columnId of columnIds) {
      values[columnId] = row.values[columnId] ?? "";
    }
    return { ...row, values };
  });
  return { ...chart, columns, rows };
}

/** Heuristic: apparel products that benefit from a size chart. */
export function isLikelyApparelProduct(input: {
  name?: string | null;
  categoryName?: string | null;
  categorySlug?: string | null;
  options?: SizeOptionSource[];
}): boolean {
  if ((input.options ?? []).some(isSizeOptionGroup)) return true;
  const haystack = [input.name, input.categoryName, input.categorySlug]
    .map((value) =>
      trimString(value)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d"),
    )
    .join(" ");
  return /(ao |ao-|thun|polo|hoodie|so mi|so-mi|jacket|quan |quan-|vay |dam )/.test(
    ` ${haystack} `,
  );
}
