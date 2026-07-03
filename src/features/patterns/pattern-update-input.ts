import { ProductionMaterialCategory } from "@prisma/client";
import { PatternValidationError } from "@/features/patterns/pattern.service";

export type PatternMeasurementInput = {
  pointOfMeasure: string;
  description: string | null;
  baseSize: string | null;
  tolerance: string | null;
  sortOrder: number;
  values: Array<{ size: string; value: string }>;
};

export type PatternUpdateInput = {
  name?: string;
  version?: number;
  productCategoryId?: string | null;
  productId?: string | null;
  baseSize?: string | null;
  sizeRange?: string | null;
  gradingRule?: string | null;
  productionMaterialCategory?: ProductionMaterialCategory | null;
  notes?: string | null;
  measurements?: PatternMeasurementInput[];
};

const PRODUCTION_MATERIAL_CATEGORY_VALUES = new Set<string>(
  Object.values(ProductionMaterialCategory),
);

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function nullableString(value: unknown): string | null | undefined {
  if (value === null) return null;
  return typeof value === "string" ? value : undefined;
}

function parseVersion(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isInteger(value) && value >= 1) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number.parseInt(value, 10);
    if (Number.isInteger(parsed) && parsed >= 1) return parsed;
  }
  if (value === undefined) return undefined;
  throw new PatternValidationError("Version rập phải là số nguyên dương.");
}

function parseProductionMaterialCategory(
  value: unknown,
): ProductionMaterialCategory | null | undefined {
  if (value === null) return null;
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !value.trim()) {
    throw new PatternValidationError("Danh mục vật liệu sản xuất không hợp lệ.");
  }
  if (!PRODUCTION_MATERIAL_CATEGORY_VALUES.has(value)) {
    throw new PatternValidationError("Danh mục vật liệu sản xuất không hợp lệ.");
  }
  return value as ProductionMaterialCategory;
}

function parseMeasurements(value: unknown): PatternMeasurementInput[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    throw new PatternValidationError("Dữ liệu bảng đo không hợp lệ.");
  }

  return value
    .map((row, index) => {
      if (!row || typeof row !== "object") {
        throw new PatternValidationError("Dữ liệu bảng đo không hợp lệ.");
      }
      const record = row as Record<string, unknown>;
      const pointOfMeasure = String(record.pointOfMeasure ?? "").trim();

      const values = Array.isArray(record.values)
        ? (record.values as Array<Record<string, unknown>>)
            .map((entry) => ({
              size: String(entry.size ?? "").trim(),
              value: String(entry.value ?? "").trim(),
            }))
            .filter((entry) => entry.size && entry.value)
        : [];

      return {
        pointOfMeasure,
        description:
          record.description === null
            ? null
            : typeof record.description === "string"
              ? record.description
              : null,
        baseSize:
          record.baseSize === null
            ? null
            : typeof record.baseSize === "string"
              ? record.baseSize
              : null,
        tolerance:
          record.tolerance === null
            ? null
            : typeof record.tolerance === "string"
              ? record.tolerance
              : null,
        sortOrder: typeof record.sortOrder === "number" ? record.sortOrder : index,
        values,
      };
    })
    .filter((row) => row.pointOfMeasure);
}

export function parsePatternUpdateBody(body: unknown): PatternUpdateInput {
  if (!body || typeof body !== "object") {
    throw new PatternValidationError("Dữ liệu cập nhật không hợp lệ.");
  }

  const raw = body as Record<string, unknown>;
  const name = optionalString(raw.name);
  if (name !== undefined && !name.trim()) {
    throw new PatternValidationError("Tên rập không được để trống.");
  }

  return {
    name: name?.trim(),
    version: parseVersion(raw.version),
    productCategoryId: nullableString(raw.productCategoryId),
    productId: nullableString(raw.productId),
    baseSize: nullableString(raw.baseSize),
    sizeRange: nullableString(raw.sizeRange),
    gradingRule: nullableString(raw.gradingRule),
    productionMaterialCategory: parseProductionMaterialCategory(raw.productionMaterialCategory),
    notes: nullableString(raw.notes),
    measurements: parseMeasurements(raw.measurements),
  };
}
