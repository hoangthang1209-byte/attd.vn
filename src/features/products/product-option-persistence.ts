import type { OptionGroupFormRow } from "@/components/admin/products/ProductOptionGroupBuilder";

/** Client-only keys from `createClientKey("opt"|"val"|…)`. Never send these as DB relation IDs. */
const CLIENT_RELATION_KEY_RE = /^(opt|val|var|spec|cap|attr)-[a-z0-9]+$/i;

export function isPersistedProductRelationId(id: string | undefined | null): boolean {
  if (!id?.trim()) return false;
  return !CLIENT_RELATION_KEY_RE.test(id.trim());
}

export type PersistedOptionValuePayload = {
  id?: string;
  attributeValueId?: string;
  label: string;
  valueCode?: string;
  imageUrl?: string;
  sortOrder: number;
};

export type PersistedOptionGroupPayload = {
  id?: string;
  attributeId?: string;
  name: string;
  slug?: string;
  sortOrder: number;
  values: PersistedOptionValuePayload[];
};

/**
 * Build PATCH options payload from in-memory form rows.
 * Omits client-only temporary IDs so the API creates real DB rows instead of
 * failing ownership checks on `opt-…` / `val-…` keys.
 */
export function buildPersistedOptionsPayload(
  options: OptionGroupFormRow[],
): PersistedOptionGroupPayload[] {
  return options
    .filter((group) => group.name.trim())
    .map((group, index) => ({
      id: isPersistedProductRelationId(group.id) ? group.id : undefined,
      attributeId: group.attributeId,
      name: group.name.trim(),
      slug: group.slug.trim() || undefined,
      sortOrder: group.sortOrder ?? index,
      values: group.values
        .filter((value) => value.label.trim())
        .map((value, valueIndex) => ({
          id: isPersistedProductRelationId(value.id) ? value.id : undefined,
          attributeValueId: value.attributeValueId,
          label: value.label.trim(),
          valueCode: value.valueCode.trim() || undefined,
          imageUrl: value.imageUrl.trim() || undefined,
          sortOrder: value.sortOrder ?? valueIndex,
        })),
    }));
}

export function countActiveOptionValues(options: OptionGroupFormRow[]): number {
  return options.reduce(
    (total, group) =>
      total +
      (group.name.trim()
        ? group.values.filter((value) => value.label.trim()).length
        : 0),
    0,
  );
}

export function optionGroupsMissingPersistedIds(options: OptionGroupFormRow[]): boolean {
  return options.some(
    (group) =>
      group.name.trim() &&
      group.values.some(
        (value) => value.label.trim() && !isPersistedProductRelationId(value.id),
      ),
  );
}

export const OPTIONS_NOT_PERSISTED_FOR_MATRIX_ERROR =
  "Không thể tạo biến thể vì nhóm tuỳ chọn chưa được lưu. Vui lòng lưu sản phẩm rồi thử lại.";
