import type { ProductOptionInput } from "@/features/products/product-admin-cms";
import {
  generateVariantCode,
  normalizeSkuPart,
} from "@/features/products/product-sku-utils";

/** Warn admin when theoretical combinations exceed this count. */
export const VARIANT_MATRIX_WARN_THRESHOLD = 100;

/** Require explicit confirmation above this count. */
export const VARIANT_MATRIX_CONFIRM_THRESHOLD = 250;

export type MatrixOptionValue = {
  id: string;
  label: string;
  valueCode?: string | null;
  sortOrder: number;
};

export type MatrixOptionGroup = {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  values: MatrixOptionValue[];
};

export type MatrixCombination = {
  signature: string;
  valueIds: string[];
  labels: string[];
  displayLabel: string;
};

export function normalizeOptionName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/\s+/g, " ");
}

export function combinationSignature(valueIds: string[]): string {
  return [...valueIds].sort().join("|");
}

export function buildDisplayLabel(labels: string[]): string {
  return labels.map((label) => label.trim()).filter(Boolean).join(" / ");
}

export function computeTheoreticalCombinationCount(
  groups: Array<{ values: unknown[] }>,
): number {
  const activeGroups = groups.filter((group) => group.values.length > 0);
  if (!activeGroups.length) return 0;
  return activeGroups.reduce((total, group) => total * group.values.length, 1);
}

export function buildCombinationPreviewText(groups: MatrixOptionGroup[]): string {
  const active = groups
    .map((group) => ({
      name: group.name.trim(),
      count: group.values.length,
    }))
    .filter((group) => group.count > 0);

  if (!active.length) {
    return "Chưa có nhóm biến thể hoặc giá trị để tạo tổ hợp.";
  }

  const parts = active.map((group) => `${group.count} ${group.name}`);
  const total = active.reduce((acc, group) => acc * group.count, 1);
  return `${parts.join(" × ")} = ${total} biến thể`;
}

export function buildCartesianCombinations(groups: MatrixOptionGroup[]): MatrixCombination[] {
  const activeGroups = groups
    .filter((group) => group.values.length > 0)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  if (!activeGroups.length) return [];

  let combos: MatrixCombination[] = [{ signature: "", valueIds: [], labels: [], displayLabel: "" }];

  for (const group of activeGroups) {
    const sortedValues = [...group.values].sort((a, b) => a.sortOrder - b.sortOrder);
    const next: MatrixCombination[] = [];
    for (const combo of combos) {
      for (const value of sortedValues) {
        const valueIds = [...combo.valueIds, value.id];
        const labels = [...combo.labels, value.label];
        next.push({
          signature: combinationSignature(valueIds),
          valueIds,
          labels,
          displayLabel: buildDisplayLabel(labels),
        });
      }
    }
    combos = next;
  }

  return combos;
}

export function validateOptionGroupNames(options: ProductOptionInput[]): string | null {
  const seen = new Set<string>();
  for (const option of options) {
    const name = option.name.trim();
    if (!name) return "Tên nhóm biến thể không được để trống.";
    const key = normalizeOptionName(name);
    if (seen.has(key)) {
      return `Nhóm biến thể "${name}" bị trùng.`;
    }
    seen.add(key);
  }
  return null;
}

export function validateOptionValues(options: ProductOptionInput[]): string | null {
  for (const option of options) {
    const seen = new Set<string>();
    for (const value of option.values) {
      const label = value.label.trim();
      if (!label) return `Giá trị trong nhóm "${option.name}" không được để trống.`;
      const key = normalizeOptionName(label);
      if (seen.has(key)) {
        return `Giá trị "${label}" bị trùng trong nhóm "${option.name}".`;
      }
      seen.add(key);
    }
  }
  return null;
}

export function isColorOptionGroup(group: Pick<MatrixOptionGroup, "slug" | "name">): boolean {
  const slug = group.slug.toLowerCase();
  const name = group.name.toLowerCase();
  return slug.includes("color") || slug.includes("mau") || name.includes("màu");
}

/** Minimum option groups with values required before matrix generation. */
export const VARIANT_MATRIX_MIN_OPTION_GROUPS = 2;

export function countActiveMatrixOptionGroups(groups: Array<{ values: unknown[] }>): number {
  return groups.filter((group) => group.values.length > 0).length;
}

/** Deterministic ASCII suffix when option value code/label normalize to empty. */
export function shortDeterministicOptionValueSuffix(optionValueId: string): string {
  const alnum = optionValueId.replace(/[^a-z0-9]/gi, "").toUpperCase();
  if (alnum.length >= 4) return alnum.slice(-4);
  if (alnum.length > 0) return alnum.padStart(4, "0");
  return "V000";
}

export function resolveMatrixOptionValueSkuPart(value: MatrixOptionValue): string {
  const fromCode = value.valueCode?.trim() ? normalizeSkuPart(value.valueCode).slice(0, 6) : "";
  if (fromCode) return fromCode;
  const fromLabel = normalizeSkuPart(value.label).slice(0, 6);
  if (fromLabel) return fromLabel;
  return shortDeterministicOptionValueSuffix(value.id);
}

export function validateMatrixCombinationForGeneration(
  groups: MatrixOptionGroup[],
  valueIds: string[],
): string | null {
  const activeGroups = groups
    .filter((group) => group.values.length > 0)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  if (!valueIds.length) {
    return "Tổ hợp chưa chọn giá trị tuỳ chọn.";
  }

  if (valueIds.length !== activeGroups.length) {
    return `Tổ hợp thiếu giá trị tuỳ chọn (cần ${activeGroups.length}, có ${valueIds.length}).`;
  }

  const uniqueIds = new Set(valueIds);
  if (uniqueIds.size !== valueIds.length) {
    return "Tổ hợp chứa giá trị tuỳ chọn bị trùng.";
  }

  for (const group of activeGroups) {
    const selected = group.values.filter((value) => valueIds.includes(value.id));
    if (!selected.length) {
      return `Giá trị tuỳ chọn không tồn tại trong nhóm "${group.name.trim()}".`;
    }
    if (selected.length > 1) {
      return `Tổ hợp chọn nhiều giá trị trong nhóm "${group.name.trim()}".`;
    }
  }

  return null;
}

export function buildMatrixCombinationSkuSuffix(
  groups: MatrixOptionGroup[],
  valueIds: string[],
): string {
  const legacy = mapCombinationToLegacyFields(groups, valueIds);
  const fromLegacy = generateVariantCode(legacy);
  if (fromLegacy) return fromLegacy;

  const parts: string[] = [];
  const sortedGroups = [...groups]
    .filter((group) => group.values.length > 0)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  for (const group of sortedGroups) {
    const value = group.values.find((item) => valueIds.includes(item.id));
    if (!value) continue;
    parts.push(resolveMatrixOptionValueSkuPart(value));
  }
  return parts.join("-");
}

export function mapCombinationToLegacyFields(
  groups: MatrixOptionGroup[],
  valueIds: string[],
): {
  colorName?: string;
  colorCode?: string;
  sizeName?: string;
  dimensions?: string;
  capacity?: string;
} {
  const fields: {
    colorName?: string;
    colorCode?: string;
    sizeName?: string;
    dimensions?: string;
    capacity?: string;
  } = {};

  for (const group of groups) {
    const value = group.values.find((item) => valueIds.includes(item.id));
    if (!value) continue;
    const slug = group.slug.toLowerCase();
    const name = group.name.toLowerCase();

    if (isColorOptionGroup(group)) {
      fields.colorName = value.label;
      fields.colorCode = value.valueCode ?? undefined;
      continue;
    }
    if (slug.includes("size") || slug.includes("kich") || name.includes("kích thước")) {
      fields.sizeName = value.label;
      continue;
    }
    if (slug.includes("dimension") || name.includes("kích thước")) {
      fields.dimensions = value.label;
      continue;
    }
    if (slug.includes("capacity") || slug.includes("dung") || name.includes("dung tích")) {
      fields.capacity = value.label;
    }
  }

  return fields;
}

export function createClientKey(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

/** Stable ref for unsaved option values: `slug::normalized-label`. */
export function buildOptionValueRef(optionSlug: string, label: string): string {
  return `${optionSlug.trim()}::${normalizeOptionName(label)}`;
}

export function resolveOptionValueRefFromGroups(
  groups: Array<{
    id?: string;
    clientKey: string;
    name: string;
    slug: string;
    values: Array<{ id?: string; clientKey: string; label: string }>;
  }>,
  valueId: string,
): string {
  for (const group of groups) {
    const value = group.values.find((item) => item.id === valueId || item.clientKey === valueId);
    if (!value) continue;
    if (value.id && isUuid(value.id)) return value.id;
    const slug =
      group.slug.trim() ||
      group.name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") ||
      group.clientKey;
    return buildOptionValueRef(slug, value.label);
  }
  return valueId;
}
