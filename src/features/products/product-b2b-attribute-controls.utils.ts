import type { SharedAttributePickerOption } from "@/components/admin/products/ProductOptionGroupBuilder";
import type { ProductAttributeAssignmentFormRow } from "@/features/products/product-catalog-form-mappers";
import {
  assignmentFieldKey,
  legacyKeysForAssignment,
  resolveFieldError,
} from "@/features/products/product-form-row-error-keys";

export const B2B_MANAGED_SHARED_ATTRIBUTE_CODES = ["MATERIAL", "FIT"] as const;

export type B2BManagedAttributeCode = (typeof B2B_MANAGED_SHARED_ATTRIBUTE_CODES)[number];

const LEGACY_FIT_VALUE_KEYS = new Set(["unisex"]);

export function createAssignmentClientKey(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function findSharedAttributeByCode(
  sharedAttributes: SharedAttributePickerOption[],
  code: B2BManagedAttributeCode,
): SharedAttributePickerOption | null {
  return sharedAttributes.find((item) => item.code === code) ?? null;
}

export function findAssignmentForAttribute(
  rows: ProductAttributeAssignmentFormRow[],
  attributeId: string,
): ProductAttributeAssignmentFormRow | undefined {
  return rows.find((row) => row.attributeId === attributeId);
}

export function assignmentIndexForAttribute(
  rows: ProductAttributeAssignmentFormRow[],
  attributeId: string,
): number {
  return rows.findIndex((row) => row.attributeId === attributeId);
}

export function assignmentFieldError(
  fieldErrors: Record<string, string>,
  rows: ProductAttributeAssignmentFormRow[],
  attributeId: string,
  field: "attributeId" | "attributeValueId" | "customValue",
): string | undefined {
  const row = findAssignmentForAttribute(rows, attributeId);
  if (!row) return undefined;
  return resolveFieldError(
    fieldErrors,
    assignmentFieldKey(row, field),
    legacyKeysForAssignment(rows, row, field),
  );
}

export function upsertAssignmentForAttribute(
  rows: ProductAttributeAssignmentFormRow[],
  attributeId: string,
  patch: Partial<ProductAttributeAssignmentFormRow>,
): ProductAttributeAssignmentFormRow[] {
  const existing = findAssignmentForAttribute(rows, attributeId);
  if (existing) {
    return rows.map((row) =>
      row.attributeId === attributeId ? { ...row, ...patch } : row,
    );
  }
  return [
    ...rows,
    {
      clientKey: createAssignmentClientKey(`b2b-${attributeId}`),
      attributeId,
      useCustomValue: false,
      sortOrder: rows.length,
      ...patch,
    },
  ];
}

export function removeAssignmentForAttribute(
  rows: ProductAttributeAssignmentFormRow[],
  attributeId: string,
): ProductAttributeAssignmentFormRow[] {
  return rows.filter((row) => row.attributeId !== attributeId);
}

export function isLegacyFitSharedValue(name: string): boolean {
  return LEGACY_FIT_VALUE_KEYS.has(
    name
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, ""),
  );
}

export function listSelectableSharedValues(
  attribute: SharedAttributePickerOption,
  selectedValueId?: string,
  options?: { allowLegacyFitValues?: boolean },
): SharedAttributePickerOption["values"] {
  return attribute.values.filter((value) => {
    if (value.status !== "ACTIVE" && value.id !== selectedValueId) return false;
    if (
      attribute.code === "FIT" &&
      !options?.allowLegacyFitValues &&
      isLegacyFitSharedValue(value.name) &&
      value.id !== selectedValueId
    ) {
      return false;
    }
    return true;
  });
}

export function formatSharedValueLabel(
  attributeCode: string,
  valueName: string,
  valueStatus: "ACTIVE" | "INACTIVE",
): string {
  if (attributeCode === "FIT" && isLegacyFitSharedValue(valueName)) {
    return `${valueName} (legacy)`;
  }
  if (valueStatus !== "ACTIVE") {
    return `${valueName} (ngừng dùng)`;
  }
  return valueName;
}

export const B2B_ATTRIBUTE_UNAVAILABLE_MESSAGES: Record<B2BManagedAttributeCode, string> = {
  MATERIAL: "Chưa có thuộc tính dùng chung “Chất liệu”.",
  FIT: "Chưa có thuộc tính dùng chung “Form dáng”.",
};
