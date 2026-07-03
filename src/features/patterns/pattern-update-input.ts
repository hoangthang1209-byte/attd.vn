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
const INVALID_NUMBER_MESSAGE = "Giá trị phải là số hợp lệ.";
const DUPLICATE_MESSAGE = "Bảng đo có cột size hoặc điểm đo bị trùng.";

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

function normalizeMeasurementNumber(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized = trimmed.includes(",") && !trimmed.includes(".") ? trimmed.replace(",", ".") : trimmed;
  if (!/^-?(?:\d+|\d*\.\d+)$/.test(normalized)) return null;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return null;
  return normalized;
}

function parseMeasurements(value: unknown): PatternMeasurementInput[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    throw new PatternValidationError("Dữ liệu bảng đo không hợp lệ.", undefined, "VALIDATION");
  }

  const fieldErrors: Record<string, string> = {};
  const seenPoms = new Set<string>();
  const measurements = value
    .map((row, index) => {
      if (!row || typeof row !== "object") {
        throw new PatternValidationError("Dữ liệu bảng đo không hợp lệ.", undefined, "VALIDATION");
      }
      const record = row as Record<string, unknown>;
      const pointOfMeasure = String(record.pointOfMeasure ?? "").trim();
      const normalizedPom = pointOfMeasure.toLocaleLowerCase("vi");
      if (pointOfMeasure) {
        if (seenPoms.has(normalizedPom)) {
          fieldErrors[`measurements.${index}.pointOfMeasure`] = DUPLICATE_MESSAGE;
        }
        seenPoms.add(normalizedPom);
      }

      const seenSizes = new Set<string>();
      const values = Array.isArray(record.values)
        ? (record.values as unknown[]).flatMap((entry) => {
            const valueRecord = entry && typeof entry === "object" ? (entry as Record<string, unknown>) : {};
            const rawSize = String(valueRecord.size ?? "").trim();
            const size = rawSize.toUpperCase();
            const rawValue = String(valueRecord.value ?? "").trim();
            if (!size || !rawValue) return [];

            const fieldKey = `measurements.${index}.values.${size}`;
            if (seenSizes.has(size)) {
              fieldErrors[fieldKey] = DUPLICATE_MESSAGE;
              return [];
            }
            seenSizes.add(size);

            const normalizedValue = normalizeMeasurementNumber(rawValue);
            if (normalizedValue === null) {
              fieldErrors[fieldKey] = INVALID_NUMBER_MESSAGE;
              return [];
            }

            return [{ size, value: normalizedValue }];
          })
        : [];

      const tolerance =
        record.tolerance === null
          ? null
          : typeof record.tolerance === "string"
            ? record.tolerance.trim()
            : null;
      const normalizedTolerance = tolerance ? normalizeMeasurementNumber(tolerance) : null;
      if (tolerance && normalizedTolerance === null) {
        fieldErrors[`measurements.${index}.tolerance`] = INVALID_NUMBER_MESSAGE;
      }

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
        tolerance: normalizedTolerance,
        sortOrder: typeof record.sortOrder === "number" ? record.sortOrder : index,
        values,
      };
    })
    .filter((row) => row.pointOfMeasure);

  if (Object.keys(fieldErrors).length > 0) {
    throw new PatternValidationError("Dữ liệu bảng đo không hợp lệ.", fieldErrors, "VALIDATION");
  }

  return measurements;
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
