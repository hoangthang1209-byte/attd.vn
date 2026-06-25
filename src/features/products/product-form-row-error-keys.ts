import type { OptionGroupFormRow } from "@/components/admin/products/ProductOptionGroupBuilder";
import type { ProductAttributeAssignmentFormRow } from "@/features/products/product-catalog-form-mappers";

type RowRef = { id?: string; clientKey?: string };

export function rowRefPrefix(
  namespace: string,
  row: RowRef,
): string {
  if (row.id) return `${namespace}.byId.${row.id}`;
  if (row.clientKey) return `${namespace}.byClientKey.${row.clientKey}`;
  return namespace;
}

export function assignmentFieldKey(
  row: Pick<ProductAttributeAssignmentFormRow, "id" | "clientKey">,
  field: string,
): string {
  return `${rowRefPrefix("attributeAssignments", row)}.${field}`;
}

export function optionGroupFieldKey(
  group: Pick<OptionGroupFormRow, "id" | "clientKey">,
  field: string,
): string {
  return `${rowRefPrefix("options", group)}.${field}`;
}

export function optionValueFieldKey(
  group: Pick<OptionGroupFormRow, "id" | "clientKey">,
  value: { id?: string; clientKey: string },
  field: string,
): string {
  const groupPrefix = rowRefPrefix("options", group);
  if (value.id) return `${groupPrefix}.values.byId.${value.id}.${field}`;
  return `${groupPrefix}.values.byClientKey.${value.clientKey}.${field}`;
}

export function specificationFieldKey(
  row: { id?: string; clientKey?: string },
  field: string,
): string {
  return `${rowRefPrefix("specifications", row)}.${field}`;
}

export function customizationFieldKey(
  row: { id?: string; clientKey?: string },
  field: string,
): string {
  return `${rowRefPrefix("customizations", row)}.${field}`;
}

export function resolveFieldError(
  fieldErrors: Record<string, string>,
  stableKey: string,
  legacyKeys: string[] = [],
): string | undefined {
  if (fieldErrors[stableKey]) return fieldErrors[stableKey];
  for (const key of legacyKeys) {
    if (fieldErrors[key]) return fieldErrors[key];
  }
  return undefined;
}

export type ProductFormErrorContext = {
  attributeAssignments?: ProductAttributeAssignmentFormRow[];
  options?: OptionGroupFormRow[];
  specifications?: Array<{ id?: string; clientKey?: string }>;
  customizations?: Array<{ id?: string; clientKey?: string }>;
};

function legacyAssignmentKey(index: number, field: string): string {
  return `attributeAssignments.${index}.${field}`;
}

function legacyOptionGroupKey(index: number, field: string): string {
  return `options.${index}.${field}`;
}

function legacyOptionValueKey(groupIndex: number, valueIndex: number, field: string): string {
  return `options.${groupIndex}.values.${valueIndex}.${field}`;
}

function legacySpecificationKey(index: number, field: string): string {
  return `specifications.${index}.${field}`;
}

function legacyCustomizationKey(index: number, field: string): string {
  return `customizations.${index}.${field}`;
}

/** Map index-based or mixed server keys to stable byId/byClientKey keys when possible. */
export function normalizeProductFormFieldErrors(
  fieldErrors: Record<string, string>,
  context: ProductFormErrorContext,
): Record<string, string> {
  const normalized: Record<string, string> = { ...fieldErrors };

  const assignments = context.attributeAssignments ?? [];
  for (const [index, row] of assignments.entries()) {
    for (const field of ["attributeId", "attributeValueId", "customValue"] as const) {
      const legacy = legacyAssignmentKey(index, field);
      if (normalized[legacy]) {
        const stable = assignmentFieldKey(row, field);
        normalized[stable] = normalized[legacy];
        delete normalized[legacy];
      }
    }
  }

  const options = context.options ?? [];
  for (const [groupIndex, group] of options.entries()) {
    for (const field of ["name", "slug"] as const) {
      const legacy = legacyOptionGroupKey(groupIndex, field);
      if (normalized[legacy]) {
        const stable = optionGroupFieldKey(group, field);
        normalized[stable] = normalized[legacy];
        delete normalized[legacy];
      }
    }
    for (const [valueIndex, value] of group.values.entries()) {
      for (const field of ["label", "valueCode", "imageUrl"] as const) {
        const legacy = legacyOptionValueKey(groupIndex, valueIndex, field);
        if (normalized[legacy]) {
          const stable = optionValueFieldKey(group, value, field);
          normalized[stable] = normalized[legacy];
          delete normalized[legacy];
        }
      }
    }
  }

  const specifications = context.specifications ?? [];
  for (const [index, row] of specifications.entries()) {
    for (const field of ["label", "value"] as const) {
      const legacy = legacySpecificationKey(index, field);
      if (normalized[legacy]) {
        const stable = specificationFieldKey(row, field);
        normalized[stable] = normalized[legacy];
        delete normalized[legacy];
      }
    }
  }

  const customizations = context.customizations ?? [];
  for (const [index, row] of customizations.entries()) {
    for (const field of ["label", "description"] as const) {
      const legacy = legacyCustomizationKey(index, field);
      if (normalized[legacy]) {
        const stable = customizationFieldKey(row, field);
        normalized[stable] = normalized[legacy];
        delete normalized[legacy];
      }
    }
  }

  return normalized;
}

export function legacyKeysForAssignment(
  rows: ProductAttributeAssignmentFormRow[],
  row: ProductAttributeAssignmentFormRow,
  field: string,
): string[] {
  const index = rows.findIndex((item) => item.clientKey === row.clientKey);
  return index >= 0 ? [legacyAssignmentKey(index, field)] : [];
}

export function legacyKeysForOptionGroup(
  groups: OptionGroupFormRow[],
  group: OptionGroupFormRow,
  field: string,
): string[] {
  const index = groups.findIndex((item) => item.clientKey === group.clientKey);
  return index >= 0 ? [legacyOptionGroupKey(index, field)] : [];
}

export function legacyKeysForOptionValue(
  groups: OptionGroupFormRow[],
  group: OptionGroupFormRow,
  value: { id?: string; clientKey: string },
  field: string,
): string[] {
  const groupIndex = groups.findIndex((item) => item.clientKey === group.clientKey);
  if (groupIndex < 0) return [];
  const valueIndex = group.values.findIndex(
    (item) => item.clientKey === value.clientKey || (value.id && item.id === value.id),
  );
  return valueIndex >= 0 ? [legacyOptionValueKey(groupIndex, valueIndex, field)] : [];
}

export function legacyKeysForSpecification(
  rows: Array<{ id?: string; clientKey?: string }>,
  row: { id?: string; clientKey?: string },
  field: string,
): string[] {
  const index = rows.findIndex(
    (item) =>
      (row.clientKey && item.clientKey === row.clientKey) ||
      (row.id && item.id === row.id),
  );
  return index >= 0 ? [legacySpecificationKey(index, field)] : [];
}

export function legacyKeysForCustomization(
  rows: Array<{ id?: string; clientKey?: string }>,
  row: { id?: string; clientKey?: string },
  field: string,
): string[] {
  const index = rows.findIndex(
    (item) =>
      (row.clientKey && item.clientKey === row.clientKey) ||
      (row.id && item.id === row.id),
  );
  return index >= 0 ? [legacyCustomizationKey(index, field)] : [];
}

export function keysToClearForField(editedKey: string): string[] {
  const keys = [editedKey];
  const parts = editedKey.split(".");
  if (parts.length >= 2) {
    const rowPrefix = parts.slice(0, -1).join(".");
    keys.push(rowPrefix);
  }
  return keys;
}
