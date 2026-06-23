import { isValidImageUrl } from "@/features/products/product-admin-input";
import { PRODUCT_IMAGE_URL_ERROR } from "@/features/products/product-image-url";
import {
  combinationSignature,
  normalizeOptionName,
  resolveOptionValueRefFromGroups,
  validateOptionGroupNames,
  validateOptionValues,
} from "@/features/products/product-variant-matrix.utils";
import { validateOptionValueCodesInGroup } from "@/features/products/product-option-code.utils";
import type { OptionGroupFormRow } from "@/components/admin/products/ProductOptionGroupBuilder";
import type { MatrixVariantFormRow } from "@/features/products/product-catalog-form-mappers";
import {
  focusVariantField,
  variantFieldKey,
  variantRefFromRow,
  variantRowHasError as rowHasStableError,
} from "@/features/products/variant-field-errors";

export type ProductCatalogFormShape = {
  name: string;
  categoryId: string;
  featuredImage: string;
  gallery: string[];
  defaultMoq: string;
  leadTime?: string;
  slug?: string;
  options: OptionGroupFormRow[];
  variants: MatrixVariantFormRow[];
  specifications?: Array<{ label: string; value: string }>;
  customizations?: Array<{ label: string; description?: string }>;
  attributeAssignments?: Array<{
    attributeId: string;
    attributeValueId?: string;
    customValue?: string;
    useCustomValue?: boolean;
  }>;
};

function parseNumberField(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const n = parseFloat(trimmed.replace(/[,\s]/g, ""));
  return Number.isFinite(n) ? n : undefined;
}

export function fieldErrorInputClass(hasError: boolean): string {
  return hasError ? " admin-input--error" : "";
}

export function resolveTabForField(field: string): "basic" | "media" | "variants" | "content" | "seo" {
  if (field.startsWith("options") || field.startsWith("variants") || field === "variants") {
    return "variants";
  }
  if (field.startsWith("gallery") || field === "featuredImage") return "media";
  if (
    field === "shortDescription" ||
    field === "description" ||
    field.startsWith("specifications") ||
    field.startsWith("customizations") ||
    field.startsWith("attributeAssignments")
  ) {
    return "content";
  }
  if (field.startsWith("seo")) return "seo";
  return "basic";
}

export function scrollToFirstFieldError(fieldErrors: Record<string, string>): void {
  const firstField = Object.keys(fieldErrors)[0];
  if (!firstField) return;

  if (firstField.startsWith("variants.")) {
    focusVariantField(firstField);
    return;
  }

  const el =
    document.querySelector<HTMLElement>(`[data-field="${firstField}"]`) ??
    document.querySelector<HTMLElement>(`[data-field-prefix="${firstField.split(".")[0]}"]`);

  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  const focusable = el.matches("input,select,textarea,button")
    ? el
    : el.querySelector<HTMLElement>("input,select,textarea,button");
  focusable?.focus({ preventScroll: true });
}

export function validateProductCatalogFormLocal(form: ProductCatalogFormShape): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!form.name.trim()) errors.name = "Tên sản phẩm là bắt buộc.";
  if (!form.categoryId) errors.categoryId = "Vui lòng chọn danh mục.";
  if (form.slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug)) {
    errors.slug = "Slug chỉ gồm chữ thường, số và dấu gạch ngang.";
  }
  if (form.leadTime && form.leadTime.length > 120) {
    errors.leadTime = "Lead-time quá dài. Vui lòng rút gọn dưới 120 ký tự.";
  }

  if (form.featuredImage.trim() && !isValidImageUrl(form.featuredImage)) {
    errors.featuredImage = PRODUCT_IMAGE_URL_ERROR;
  }

  form.gallery.forEach((url, index) => {
    if (url.trim() && !isValidImageUrl(url)) {
      errors[`gallery.${index}`] = PRODUCT_IMAGE_URL_ERROR;
    }
  });

  if (form.defaultMoq.trim() && parseNumberField(form.defaultMoq) === undefined) {
    errors.defaultMoq = "MOQ phải là số.";
  }

  const optionInputs = form.options
    .filter((group) => group.name.trim())
    .map((group, index) => ({
      name: group.name.trim(),
      slug: group.slug.trim() || undefined,
      sortOrder: group.sortOrder ?? index,
      values: group.values
        .filter((value) => value.label.trim())
        .map((value, valueIndex) => ({
          label: value.label.trim(),
          valueCode: value.valueCode.trim() || undefined,
          sortOrder: value.sortOrder ?? valueIndex,
        })),
    }));

  const groupNameError = validateOptionGroupNames(optionInputs);
  if (groupNameError) errors.options = groupNameError;

  const valueLabelError = validateOptionValues(optionInputs);
  if (valueLabelError && !errors.options) errors.options = valueLabelError;

  form.options.forEach((group, groupIndex) => {
    if (!group.name.trim()) return;
    Object.assign(
      errors,
      validateOptionValueCodesInGroup(groupIndex, group.name, group.values),
    );
    group.values.forEach((value, valueIndex) => {
      const dup = group.values.some(
        (other, otherIndex) =>
          otherIndex !== valueIndex &&
          value.label.trim() &&
          normalizeOptionName(other.label) === normalizeOptionName(value.label),
      );
      if (dup) {
        errors[`options.${groupIndex}.values.${valueIndex}.label`] =
          `Giá trị "${value.label}" bị trùng trong nhóm.`;
      }
    });
  });

  form.variants.forEach((v) => {
    const ref = variantRefFromRow(v);
    const prefix = variantFieldKey(ref, "").slice(0, -1);
    if (v.wholesalePrice.trim() && parseNumberField(v.wholesalePrice) === undefined) {
      errors[`${prefix}.wholesalePrice`] = "Giá sỉ phải là số.";
    }
    if (v.dealerPrice.trim() && parseNumberField(v.dealerPrice) === undefined) {
      errors[`${prefix}.dealerPrice`] = "Giá đại lý phải là số.";
    }
    if (v.stockQty.trim() && !Number.isInteger(Number(v.stockQty))) {
      errors[`${prefix}.stockQty`] = "Tồn kho phải là số.";
    }
    if (v.moqOverride.trim() && parseNumberField(v.moqOverride) === undefined) {
      errors[`${prefix}.moqOverride`] = "MOQ ghi đè phải là số.";
    }
    if (v.leadTimeOverride.trim() && v.leadTimeOverride.length > 120) {
      errors[`${prefix}.leadTimeOverride`] = "Lead-time quá dài.";
    }
    if (v.imageUrl.trim() && !isValidImageUrl(v.imageUrl)) {
      errors[`${prefix}.imageUrl`] = PRODUCT_IMAGE_URL_ERROR;
    }
    if (v.sku.trim() && v.sku.length > 64) {
      errors[`${prefix}.sku`] = "SKU quá dài.";
    }
    if (v.variantKind === "structured" && v.optionValueIds.length === 0) {
      errors[`${prefix}.optionValueIds`] = "Chọn ít nhất một giá trị thuộc tính cho biến thể.";
    }
  });

  form.specifications?.forEach((spec, index) => {
    if (spec.label.trim() && !spec.value.trim()) {
      errors[`specifications.${index}.value`] = "Giá trị thông số là bắt buộc.";
    }
    if (!spec.label.trim() && spec.value.trim()) {
      errors[`specifications.${index}.label`] = "Tên thông số là bắt buộc.";
    }
  });

  form.customizations?.forEach((cap, index) => {
    if (!cap.label.trim() && cap.description?.trim()) {
      errors[`customizations.${index}.label`] = "Tên khả năng tùy chỉnh là bắt buộc.";
    }
  });

  const seenAssignmentAttributes = new Set<string>();
  form.attributeAssignments?.forEach((row, index) => {
    if (!row.attributeId) {
      errors[`attributeAssignments.${index}.attributeId`] = "Thiếu thuộc tính được gán.";
      return;
    }
    if (seenAssignmentAttributes.has(row.attributeId)) {
      errors[`attributeAssignments.${index}.attributeId`] = "Thuộc tính đã được gán trùng.";
      return;
    }
    seenAssignmentAttributes.add(row.attributeId);

    const customValue = row.useCustomValue ? row.customValue?.trim() : "";
    const sharedValueId = row.useCustomValue ? "" : row.attributeValueId?.trim();
    if (!customValue && !sharedValueId) {
      errors[`attributeAssignments.${index}.attributeValueId`] = "Vui lòng chọn giá trị hoặc nhập giá trị riêng.";
    }
    if (customValue && sharedValueId) {
      errors[`attributeAssignments.${index}.customValue`] =
        "Chỉ chọn một: giá trị dùng chung hoặc giá trị riêng cho sản phẩm.";
    }
    if (row.useCustomValue && customValue && customValue.length > 200) {
      errors[`attributeAssignments.${index}.customValue`] = "Giá trị riêng quá dài (tối đa 200 ký tự).";
    }
  });

  const structuredCombos = new Set<string>();
  for (const variant of form.variants) {
    if (variant.variantKind !== "structured" || !variant.optionValueIds.length) continue;
    const refs = variant.optionValueIds.map((id) =>
      resolveOptionValueRefFromGroups(form.options, id),
    );
    const signature = combinationSignature(refs);
    if (structuredCombos.has(signature)) {
      errors.variants = "Tồn tại biến thể trùng tổ hợp thuộc tính.";
      break;
    }
    structuredCombos.add(signature);
  }

  return errors;
}

export function variantRowHasError(
  fieldErrors: Record<string, string>,
  variantOrIndex: MatrixVariantFormRow | number,
  variants?: MatrixVariantFormRow[],
): boolean {
  if (typeof variantOrIndex === "number") {
    const index = variantOrIndex;
    if (variants?.[index]) {
      return rowHasStableError(fieldErrors, variantRefFromRow(variants[index]), index);
    }
    return Object.keys(fieldErrors).some((key) => key.startsWith(`variants.${index}.`));
  }
  const variant = variantOrIndex;
  const index = variants?.findIndex((row) => row.clientKey === variant.clientKey) ?? -1;
  return rowHasStableError(fieldErrors, variantRefFromRow(variant), index >= 0 ? index : undefined);
}
