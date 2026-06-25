import type { VariantInput } from "@/features/products/product-admin.service";
import type {
  ProductCustomizationInput,
  ProductOptionInput,
  ProductOptionValueInput,
  ProductSpecificationInput,
} from "@/features/products/product-admin-cms";

export type ExistingVariantRow = {
  id: string;
  sku: string;
  colorName: string | null;
  colorCode: string | null;
  sizeName: string | null;
  dimensions: string | null;
  capacity: string | null;
  displayLabel: string | null;
  moqOverride: number | null;
  leadTimeOverride: string | null;
  materialOverride: string | null;
  wholesalePrice: { toNumber(): number } | number | null;
  dealerPrice: { toNumber(): number } | number | null;
  costPrice: { toNumber(): number } | number | null;
  stockQty: number;
  stockStatus: string;
  weight: { toNumber(): number } | number | null;
  imageUrl: string | null;
  internalNote: string | null;
  variantStatus: string;
  optionValueIds: string[];
};

export type ExistingOptionValueRow = {
  id: string;
  optionId: string;
  label: string;
  valueCode: string | null;
  imageUrl: string | null;
  sortOrder: number;
  attributeValueId: string | null;
};

export type ExistingOptionRow = {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  attributeId: string | null;
  values: ExistingOptionValueRow[];
};

export type ExistingSpecificationRow = {
  id: string;
  label: string;
  value: string;
  sortOrder: number;
};

export type ExistingCustomizationRow = {
  id: string;
  label: string;
  description: string | null;
  sortOrder: number;
  enabled: boolean;
};

export type ExistingAssignmentRow = {
  id: string;
  attributeId: string;
  attributeCode?: string;
  attributeValueName?: string | null;
  attributeValueId: string | null;
  customValue: string | null;
  sortOrder: number;
};

export type ExistingProductRelationState = {
  material: string | null;
  form: string | null;
  variants: ExistingVariantRow[];
  options: ExistingOptionRow[];
  specifications: ExistingSpecificationRow[];
  customizations: ExistingCustomizationRow[];
  assignments: ExistingAssignmentRow[];
};

function decimalEqual(
  a: { toNumber(): number } | number | null | undefined,
  b: number | null | undefined,
): boolean {
  const left = a == null ? null : typeof a === "number" ? a : a.toNumber();
  const right = b ?? null;
  return left === right;
}

function strEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  const left = a?.trim() || null;
  const right = b?.trim() || null;
  return left === right;
}

export function comboSignature(ids: string[]): string {
  return [...ids].sort().join("|");
}

export function variantNeedsUpdate(input: VariantInput, existing: ExistingVariantRow): boolean {
  if (input.sku?.trim() && input.sku.trim() !== existing.sku) return true;
  if (input.colorName !== undefined && !strEqual(input.colorName, existing.colorName)) return true;
  if (input.colorCode !== undefined && !strEqual(input.colorCode, existing.colorCode)) return true;
  if (input.sizeName !== undefined && !strEqual(input.sizeName, existing.sizeName)) return true;
  if (input.dimensions !== undefined && !strEqual(input.dimensions, existing.dimensions)) return true;
  if (input.capacity !== undefined && !strEqual(input.capacity, existing.capacity)) return true;
  if (input.displayLabel !== undefined && !strEqual(input.displayLabel ?? null, existing.displayLabel)) return true;
  if (input.moqOverride !== undefined && !decimalEqual(existing.moqOverride, input.moqOverride)) return true;
  if (input.leadTimeOverride !== undefined && !strEqual(input.leadTimeOverride ?? null, existing.leadTimeOverride)) return true;
  if (input.materialOverride !== undefined && !strEqual(input.materialOverride ?? null, existing.materialOverride)) return true;
  if (input.wholesalePrice !== undefined && !decimalEqual(existing.wholesalePrice, input.wholesalePrice ?? null)) return true;
  if (input.dealerPrice !== undefined && !decimalEqual(existing.dealerPrice, input.dealerPrice ?? null)) return true;
  if (input.costPrice !== undefined && !decimalEqual(existing.costPrice, input.costPrice ?? null)) return true;
  if (input.stockQty !== undefined && input.stockQty !== existing.stockQty) return true;
  if (input.stockStatus !== undefined && input.stockStatus !== existing.stockStatus) return true;
  if (input.weight !== undefined && !decimalEqual(existing.weight, input.weight ?? null)) return true;
  if (input.imageUrl !== undefined && !strEqual(input.imageUrl ?? null, existing.imageUrl)) return true;
  if (input.internalNote !== undefined && !strEqual(input.internalNote ?? null, existing.internalNote)) return true;
  if (input.variantStatus !== undefined && input.variantStatus !== existing.variantStatus) return true;
  return false;
}

export function optionGroupNeedsUpdate(
  input: ProductOptionInput,
  existing: Pick<ExistingOptionRow, "id" | "name" | "slug" | "sortOrder" | "attributeId">,
  optIndex: number,
): boolean {
  const slug = input.slug?.trim() || existing.slug;
  if (input.name.trim() !== existing.name) return true;
  if (slug !== existing.slug) return true;
  if ((input.sortOrder ?? optIndex) !== existing.sortOrder) return true;
  if ((input.attributeId ?? null) !== (existing.attributeId ?? null)) return true;
  return false;
}

export function optionValueNeedsUpdate(
  input: ProductOptionValueInput,
  existing: ExistingOptionValueRow,
  valIndex: number,
): boolean {
  if (input.label.trim() !== existing.label) return true;
  if ((input.valueCode?.trim() || null) !== (existing.valueCode?.trim() || null)) return true;
  if ((input.imageUrl?.trim() || null) !== (existing.imageUrl?.trim() || null)) return true;
  if ((input.sortOrder ?? valIndex) !== existing.sortOrder) return true;
  if ((input.attributeValueId ?? null) !== (existing.attributeValueId ?? null)) return true;
  return false;
}

export function specificationNeedsUpdate(
  input: ProductSpecificationInput,
  existing: ExistingSpecificationRow,
  index: number,
): boolean {
  return (
    input.label.trim() !== existing.label ||
    input.value.trim() !== existing.value ||
    (input.sortOrder ?? index) !== existing.sortOrder
  );
}

export function customizationNeedsUpdate(
  input: ProductCustomizationInput,
  existing: ExistingCustomizationRow,
  index: number,
): boolean {
  return (
    input.label.trim() !== existing.label ||
    (input.description?.trim() || null) !== (existing.description?.trim() || null) ||
    (input.sortOrder ?? index) !== existing.sortOrder ||
    (input.enabled ?? true) !== existing.enabled
  );
}

export function assignmentNeedsUpdate(
  input: {
    attributeId: string;
    attributeValueId?: string | null;
    customValue?: string | null;
    sortOrder?: number;
  },
  existing: ExistingAssignmentRow,
  index: number,
): boolean {
  return (
    input.attributeId !== existing.attributeId ||
    (input.attributeValueId ?? null) !== (existing.attributeValueId ?? null) ||
    (input.customValue?.trim() || null) !== (existing.customValue?.trim() || null) ||
    (input.sortOrder ?? index) !== existing.sortOrder
  );
}

export function variantOptionLinksNeedUpdate(
  desiredValueIds: string[],
  existingValueIds: string[],
): boolean {
  return comboSignature(desiredValueIds) !== comboSignature(existingValueIds);
}
