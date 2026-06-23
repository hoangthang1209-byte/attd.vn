import type { ProductAttribute, ProductAttributeValue } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeOptionName } from "@/features/products/product-variant-matrix.utils";
import {
  getAttributePreset,
  isValidAttributePresetKey,
  listAttributePresets,
  type AttributePresetDef,
  type AttributePresetKey,
  type AttributePresetValueDef,
} from "@/features/products/product-attribute-presets";
import { ProductAttributeValidationError } from "@/features/products/product-attribute.service";

export type PresetMergeMode = "create" | "add-missing-values";

export type PresetValuePreviewState =
  | "new"
  | "exists-active"
  | "exists-inactive"
  | "not-selected";

export type PresetValuePreview = {
  key: string;
  name: string;
  code: string;
  slug: string;
  hexCode?: string | null;
  sortOrder: number;
  state: PresetValuePreviewState;
  existingValueId?: string;
};

export type PresetApplyPreview = {
  presetKey: AttributePresetKey;
  presetName: string;
  attribute: AttributePresetDef["attribute"];
  attributeConflict: {
    id: string;
    name: string;
    code: string;
    slug: string;
  } | null;
  values: PresetValuePreview[];
  summary: {
    selectedCount: number;
    newCount: number;
    existingActiveCount: number;
    existingInactiveCount: number;
  };
};

export type ApplyAttributePresetInput = {
  presetKey: string;
  selectedValueKeys: string[];
  mergeMode: PresetMergeMode;
  valueNameEdits?: Record<string, string>;
  reactivateInactive?: boolean;
};

export type ApplyAttributePresetResult = {
  attributeId: string;
  attributeName: string;
  createdAttribute: boolean;
  createdValues: number;
  reusedValues: number;
  skippedValues: number;
  reactivatedValues: number;
  message: string;
};

const HEX_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

function serializePresetListItem(preset: AttributePresetDef) {
  return {
    key: preset.key,
    name: preset.name,
    description: preset.description,
    icon: preset.icon,
    valueCount: preset.values.length,
    isVariantAttribute: preset.attribute.isVariantAttribute,
    isSpecificationAttribute: preset.attribute.isSpecificationAttribute,
    displayType: preset.attribute.displayType,
    attributeCode: preset.attribute.code,
  };
}

export function listAttributePresetSummaries() {
  return listAttributePresets().map(serializePresetListItem);
}

function resolveSelectedValues(
  preset: AttributePresetDef,
  selectedValueKeys: string[],
  valueNameEdits?: Record<string, string>,
): AttributePresetValueDef[] {
  const selected = new Set(selectedValueKeys);
  return preset.values
    .filter((value) => selected.has(value.key))
    .map((value) => ({
      ...value,
      name: valueNameEdits?.[value.key]?.trim() || value.name,
    }));
}

function valueMatchesPreset(
  existing: Pick<ProductAttributeValue, "id" | "name" | "code" | "slug" | "status">,
  presetValue: Pick<AttributePresetValueDef, "name" | "code" | "slug">,
) {
  return (
    existing.code === presetValue.code
    || existing.slug === presetValue.slug
    || normalizeOptionName(existing.name) === normalizeOptionName(presetValue.name)
  );
}

async function findExistingAttribute(preset: AttributePresetDef) {
  const byCode = await prisma.productAttribute.findUnique({
    where: { code: preset.attribute.code },
    include: { values: true },
  });
  if (byCode) return byCode;

  return prisma.productAttribute.findUnique({
    where: { slug: preset.attribute.slug },
    include: { values: true },
  });
}

function buildValuePreview(
  presetValue: AttributePresetValueDef,
  existingValues: ProductAttributeValue[],
  selected: boolean,
): PresetValuePreview {
  const existing = existingValues.find((value) => valueMatchesPreset(value, presetValue));
  let state: PresetValuePreviewState = "new";
  if (!selected) {
    state = "not-selected";
  } else if (existing?.status === "ACTIVE") {
    state = "exists-active";
  } else if (existing) {
    state = "exists-inactive";
  }

  return {
    key: presetValue.key,
    name: presetValue.name,
    code: presetValue.code,
    slug: presetValue.slug,
    hexCode: presetValue.hexCode ?? null,
    sortOrder: presetValue.sortOrder,
    state,
    existingValueId: existing?.id,
  };
}

export async function previewAttributePresetApply(
  presetKey: string,
  selectedValueKeys: string[],
  valueNameEdits?: Record<string, string>,
): Promise<PresetApplyPreview> {
  if (!isValidAttributePresetKey(presetKey)) {
    throw new ProductAttributeValidationError("Bộ mặc định không hợp lệ.", { presetKey: "Không tìm thấy bộ mặc định." });
  }

  const preset = getAttributePreset(presetKey)!;
  const selectedSet = new Set(selectedValueKeys);
  const invalidKeys = selectedValueKeys.filter((key) => !preset.values.some((value) => value.key === key));
  if (invalidKeys.length) {
    throw new ProductAttributeValidationError(
      "Có giá trị không thuộc bộ mặc định đã chọn.",
      { selectedValueKeys: `Giá trị không hợp lệ: ${invalidKeys.join(", ")}` },
    );
  }

  const existingAttribute = await findExistingAttribute(preset);
  const values = preset.values.map((value) => buildValuePreview(
    valueNameEdits?.[value.key]?.trim()
      ? { ...value, name: valueNameEdits[value.key].trim() }
      : value,
    existingAttribute?.values ?? [],
    selectedSet.has(value.key),
  ));

  const selectedPreviews = values.filter((value) => value.state !== "not-selected");

  return {
    presetKey,
    presetName: preset.name,
    attribute: preset.attribute,
    attributeConflict: existingAttribute
      ? {
          id: existingAttribute.id,
          name: existingAttribute.name,
          code: existingAttribute.code,
          slug: existingAttribute.slug,
        }
      : null,
    values,
    summary: {
      selectedCount: selectedPreviews.length,
      newCount: selectedPreviews.filter((value) => value.state === "new").length,
      existingActiveCount: selectedPreviews.filter((value) => value.state === "exists-active").length,
      existingInactiveCount: selectedPreviews.filter((value) => value.state === "exists-inactive").length,
    },
  };
}

export async function applyAttributePreset(input: ApplyAttributePresetInput): Promise<ApplyAttributePresetResult> {
  const { presetKey, selectedValueKeys, mergeMode, valueNameEdits, reactivateInactive = false } = input;

  if (!isValidAttributePresetKey(presetKey)) {
    throw new ProductAttributeValidationError("Bộ mặc định không hợp lệ.", { presetKey: "Không tìm thấy bộ mặc định." });
  }
  if (!Array.isArray(selectedValueKeys) || selectedValueKeys.length === 0) {
    throw new ProductAttributeValidationError("Chưa chọn giá trị nào.", { selectedValueKeys: "Chọn ít nhất một giá trị." });
  }
  if (mergeMode !== "create" && mergeMode !== "add-missing-values") {
    throw new ProductAttributeValidationError("Chế độ áp dụng không hợp lệ.", { mergeMode: "Chế độ phải là create hoặc add-missing-values." });
  }

  const preset = getAttributePreset(presetKey)!;
  const preview = await previewAttributePresetApply(presetKey, selectedValueKeys, valueNameEdits);
  const selectedValues = resolveSelectedValues(preset, selectedValueKeys, valueNameEdits);

  for (const value of selectedValues) {
    if (!value.name.trim()) {
      throw new ProductAttributeValidationError("Tên hiển thị không hợp lệ.", { [`value.${value.key}.name`]: "Tên hiển thị là bắt buộc." });
    }
    if (value.hexCode && !HEX_RE.test(value.hexCode)) {
      throw new ProductAttributeValidationError("Mã màu HEX không hợp lệ.", { [`value.${value.key}.hexCode`]: "Mã màu HEX không hợp lệ." });
    }
  }

  if (mergeMode === "create" && preview.attributeConflict) {
    throw new ProductAttributeValidationError(
      `Thuộc tính "${preview.attributeConflict.name}" đã tồn tại.`,
      {
        attribute: `Thuộc tính "${preview.attributeConflict.name}" đã tồn tại.`,
        existingAttributeId: preview.attributeConflict.id,
      },
      409,
    );
  }

  return prisma.$transaction(async (tx) => {
    let attribute: ProductAttribute & { values: ProductAttributeValue[] };
    let createdAttribute = false;

    const existing = await tx.productAttribute.findUnique({
      where: { code: preset.attribute.code },
      include: { values: true },
    }) ?? await tx.productAttribute.findUnique({
      where: { slug: preset.attribute.slug },
      include: { values: true },
    });

    if (existing) {
      attribute = existing;
    } else {
      attribute = await tx.productAttribute.create({
        data: {
          name: preset.attribute.name,
          code: preset.attribute.code,
          slug: preset.attribute.slug,
          displayType: preset.attribute.displayType,
          isVariantAttribute: preset.attribute.isVariantAttribute,
          isSpecificationAttribute: preset.attribute.isSpecificationAttribute,
          status: "ACTIVE",
          sortOrder: preset.attribute.sortOrder,
        },
        include: { values: true },
      });
      createdAttribute = true;
    }

    let createdValues = 0;
    let reusedValues = 0;
    let skippedValues = 0;
    let reactivatedValues = 0;

    for (const presetValue of selectedValues) {
      const existingValue = attribute.values.find((value) => valueMatchesPreset(value, presetValue));

      if (existingValue?.status === "ACTIVE") {
        reusedValues++;
        continue;
      }

      if (existingValue?.status === "INACTIVE") {
        if (reactivateInactive) {
          await tx.productAttributeValue.update({
            where: { id: existingValue.id },
            data: { status: "ACTIVE" },
          });
          reactivatedValues++;
        } else {
          skippedValues++;
        }
        continue;
      }

      const codeTaken = attribute.values.some((value) => value.code === presetValue.code);
      const slugTaken = attribute.values.some((value) => value.slug === presetValue.slug);
      const nameTaken = attribute.values.some(
        (value) => normalizeOptionName(value.name) === normalizeOptionName(presetValue.name),
      );

      if (codeTaken || slugTaken || nameTaken) {
        reusedValues++;
        continue;
      }

      const created = await tx.productAttributeValue.create({
        data: {
          attributeId: attribute.id,
          name: presetValue.name,
          code: presetValue.code,
          slug: presetValue.slug,
          hexCode: presetValue.hexCode ?? null,
          status: "ACTIVE",
          sortOrder: presetValue.sortOrder,
        },
      });
      attribute.values.push(created);
      createdValues++;
    }

    const totalApplied = createdValues + reactivatedValues;
    const message = createdAttribute
      ? `Đã tạo thuộc tính "${attribute.name}" với ${totalApplied} giá trị.`
      : totalApplied > 0
        ? `Đã bổ sung ${totalApplied} giá trị cho thuộc tính "${attribute.name}".`
        : `Không có giá trị mới nào được thêm cho thuộc tính "${attribute.name}".`;

    return {
      attributeId: attribute.id,
      attributeName: attribute.name,
      createdAttribute,
      createdValues,
      reusedValues,
      skippedValues,
      reactivatedValues,
      message,
    };
  });
}
