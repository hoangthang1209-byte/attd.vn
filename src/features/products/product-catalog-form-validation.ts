import { isValidImageUrl } from "@/features/products/product-admin-input";
import { PRODUCT_IMAGE_URL_ERROR } from "@/features/products/product-image-url";
import {
  assignmentFieldKey,
  optionGroupFieldKey,
  optionValueFieldKey,
  specificationFieldKey,
  customizationFieldKey,
} from "@/features/products/product-form-row-error-keys";
import {
  combinationSignature,
  normalizeOptionName,
  resolveOptionValueRefFromGroups,
  validateOptionGroupNames,
  validateOptionValues,
} from "@/features/products/product-variant-matrix.utils";
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
  attributeAssignments?: Array<{
    id?: string;
    clientKey: string;
    attributeId: string;
    attributeValueId?: string;
    customValue?: string;
    useCustomValue?: boolean;
  }>;
  specifications?: Array<{ id?: string; clientKey?: string; label: string; value: string }>;
  customizations?: Array<{ id?: string; clientKey?: string; label: string; description?: string }>;
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

const BASIC_TAB_ASSIGNMENT_CODES = new Set(["MATERIAL", "FIT"]);

export type ValidationTabContext = {
  form?: ProductCatalogFormShape;
  sharedAttributes?: Array<{ id: string; code: string }>;
};

function findAssignmentForFieldKey(
  field: string,
  form: ProductCatalogFormShape,
) {
  const byId = /^attributeAssignments\.byId\.([^.]+)\./.exec(field);
  if (byId) {
    return form.attributeAssignments?.find((row) => row.id === byId[1]);
  }
  const byClientKey = /^attributeAssignments\.byClientKey\.([^.]+)\./.exec(field);
  if (byClientKey) {
    return form.attributeAssignments?.find((row) => row.clientKey === byClientKey[1]);
  }
  const byIndex = /^attributeAssignments\.(\d+)\./.exec(field);
  if (byIndex) {
    return form.attributeAssignments?.[Number(byIndex[1])];
  }
  return undefined;
}

function resolveAssignmentErrorTab(
  field: string,
  form: ProductCatalogFormShape,
  sharedAttributes: Array<{ id: string; code: string }>,
): "basic" | "content" {
  const assignment = findAssignmentForFieldKey(field, form);
  if (!assignment?.attributeId) return "basic";
  const attribute = sharedAttributes.find((item) => item.id === assignment.attributeId);
  if (attribute && BASIC_TAB_ASSIGNMENT_CODES.has(attribute.code)) return "basic";
  return "content";
}

export function resolveTabForField(
  field: string,
  context?: ValidationTabContext,
): "basic" | "media" | "variants" | "content" | "seo" {
  if (field.startsWith("options") || field.startsWith("variants") || field === "variants") {
    return "variants";
  }
  if (field.startsWith("gallery") || field === "featuredImage" || field === "curatedSalesBadges") return "media";
  if (field.startsWith("attributeAssignments") && context?.form) {
    return resolveAssignmentErrorTab(field, context.form, context.sharedAttributes ?? []);
  }
  if (
    field === "shortDescription" ||
    field === "description" ||
    field.startsWith("specifications") ||
    field.startsWith("customizations")
  ) {
    return "content";
  }
  if (field.startsWith("seo")) return "seo";
  return "basic";
}

function collectOptionMatrixValidationErrors(
  form: ProductCatalogFormShape,
  errors: Record<string, string>,
): void {
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

  form.options.forEach((group) => {
    if (!group.name.trim()) return;
    const seenCodes = new Set<string>();
    const seenLabels = new Set<string>();
    group.values.forEach((value) => {
      const label = value.label.trim();
      const labelKey = optionValueFieldKey(group, value, "label");
      if (!label) {
        errors[labelKey] = `Giá trị trong nhóm "${group.name}" không được để trống.`;
        return;
      }
      const normalizedLabel = normalizeOptionName(label);
      if (seenLabels.has(normalizedLabel)) {
        errors[labelKey] = `Giá trị "${label}" bị trùng trong nhóm "${group.name}".`;
      }
      seenLabels.add(normalizedLabel);

      const code = value.valueCode.trim();
      if (code) {
        const codeKey = code.toUpperCase();
        if (seenCodes.has(codeKey)) {
          errors[optionValueFieldKey(group, value, "valueCode")] =
            `Mã "${code}" bị trùng trong nhóm "${group.name}".`;
        }
        seenCodes.add(codeKey);
      }
    });
  });
}

export function validateProductDraftForMatrixGeneration(
  form: ProductCatalogFormShape,
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!form.name.trim()) errors.name = "Tên sản phẩm là bắt buộc.";
  if (!form.categoryId) errors.categoryId = "Vui lòng chọn danh mục.";
  if (form.slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug)) {
    errors.slug = "Slug chỉ gồm chữ thường, số và dấu gạch ngang.";
  }

  collectOptionMatrixValidationErrors(form, errors);

  const groupsWithValues = form.options.filter(
    (group) => group.name.trim() && group.values.some((value) => value.label.trim()),
  );
  if (groupsWithValues.length === 0 && !errors.options) {
    errors.options = "Thêm ít nhất một nhóm biến thể với giá trị đã chọn.";
  }

  return errors;
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

  collectOptionMatrixValidationErrors(form, errors);

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

  form.specifications?.forEach((spec) => {
    const row = spec as { id?: string; clientKey?: string; label: string; value: string };
    if (spec.label.trim() && !spec.value.trim()) {
      errors[specificationFieldKey(row, "value")] = "Giá trị thông số là bắt buộc.";
    }
    if (!spec.label.trim() && spec.value.trim()) {
      errors[specificationFieldKey(row, "label")] = "Tên thông số là bắt buộc.";
    }
  });

  form.customizations?.forEach((cap) => {
    const row = cap as { id?: string; clientKey?: string; label: string; description?: string };
    if (!cap.label.trim() && cap.description?.trim()) {
      errors[customizationFieldKey(row, "label")] = "Tên khả năng tùy chỉnh là bắt buộc.";
    }
  });

  const seenAssignmentAttributes = new Set<string>();
  form.attributeAssignments?.forEach((row) => {
    if (!row.attributeId) {
      errors[assignmentFieldKey(row, "attributeId")] = "Thiếu thuộc tính được gán.";
      return;
    }
    if (seenAssignmentAttributes.has(row.attributeId)) {
      errors[assignmentFieldKey(row, "attributeId")] = "Thuộc tính đã được gán trùng.";
      return;
    }
    seenAssignmentAttributes.add(row.attributeId);

    const customValue = row.useCustomValue ? row.customValue?.trim() : "";
    const sharedValueId = row.useCustomValue ? "" : row.attributeValueId?.trim();
    if (!customValue && !sharedValueId) {
      errors[assignmentFieldKey(row, "attributeValueId")] =
        "Vui lòng chọn giá trị hoặc nhập giá trị riêng.";
    }
    if (customValue && sharedValueId) {
      errors[assignmentFieldKey(row, "customValue")] =
        "Chỉ chọn một: giá trị dùng chung hoặc giá trị riêng cho sản phẩm.";
    }
    if (row.useCustomValue && customValue && customValue.length > 200) {
      errors[assignmentFieldKey(row, "customValue")] = "Giá trị riêng quá dài (tối đa 200 ký tự).";
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
