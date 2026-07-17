import type { OptionGroupFormRow } from "@/components/admin/products/ProductOptionGroupBuilder";
import { isPersistedProductRelationId } from "@/features/products/product-relation-ids";
import { normalizeOptionName } from "@/features/products/product-variant-matrix.utils";

export { isPersistedProductRelationId } from "@/features/products/product-relation-ids";

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

/** Stable fingerprint so matrix UI can detect option edits after server preview. */
export function buildOptionsFingerprint(
  options: Array<{
    name: string;
    slug?: string;
    values: Array<{ label: string; valueCode?: string }>;
  }>,
): string {
  return JSON.stringify(
    options
      .filter((group) => group.name.trim())
      .map((group) => ({
        name: normalizeOptionName(group.name),
        slug: (group.slug ?? "").trim().toLowerCase(),
        values: group.values
          .filter((value) => value.label.trim())
          .map((value) => ({
            label: normalizeOptionName(value.label),
            code: (value.valueCode ?? "").trim().toUpperCase(),
          })),
      })),
  );
}

export type MatchableOptionGroup = {
  id: string;
  name: string;
  slug: string;
};

export type MatchableOptionValue = {
  id: string;
  label: string;
  valueCode: string | null;
};

/**
 * Resolve an existing option group without requiring client-provided DB ids.
 * Prefers explicit id, then slug, then normalized name. Skips already-claimed rows.
 */
export function findMatchingOptionGroup(
  incoming: { id?: string; name: string; slug: string },
  existing: MatchableOptionGroup[],
  claimedIds: Set<string>,
): MatchableOptionGroup | undefined {
  if (incoming.id && isPersistedProductRelationId(incoming.id)) {
    const byId = existing.find((row) => row.id === incoming.id);
    if (byId && !claimedIds.has(byId.id)) return byId;
  }

  const bySlug = existing.find(
    (row) => !claimedIds.has(row.id) && row.slug === incoming.slug,
  );
  if (bySlug) return bySlug;

  const normalizedName = normalizeOptionName(incoming.name);
  return existing.find(
    (row) => !claimedIds.has(row.id) && normalizeOptionName(row.name) === normalizedName,
  );
}

/**
 * Resolve an existing option value without requiring client-provided DB ids.
 * Prefers explicit id, then normalized label, then value code.
 */
export function findMatchingOptionValue(
  incoming: { id?: string; label: string; valueCode?: string | null },
  existing: MatchableOptionValue[],
  claimedIds: Set<string>,
): MatchableOptionValue | undefined {
  if (incoming.id && isPersistedProductRelationId(incoming.id)) {
    const byId = existing.find((row) => row.id === incoming.id);
    if (byId && !claimedIds.has(byId.id)) return byId;
  }

  const normalizedLabel = normalizeOptionName(incoming.label);
  const byLabel = existing.find(
    (row) => !claimedIds.has(row.id) && normalizeOptionName(row.label) === normalizedLabel,
  );
  if (byLabel) return byLabel;

  const code = incoming.valueCode?.trim().toUpperCase();
  if (!code) return undefined;
  return existing.find(
    (row) =>
      !claimedIds.has(row.id) &&
      Boolean(row.valueCode?.trim()) &&
      row.valueCode!.trim().toUpperCase() === code,
  );
}

export const OPTIONS_NOT_PERSISTED_FOR_MATRIX_ERROR =
  "Không thể tạo biến thể vì nhóm tuỳ chọn chưa được lưu. Vui lòng lưu sản phẩm rồi thử lại.";

export const PRODUCT_SAVE_IN_PROGRESS_FOR_MATRIX_ERROR =
  "Sản phẩm đang được lưu. Vui lòng đợi hoàn tất rồi tạo biến thể.";

export const MATRIX_PREVIEW_STALE_ERROR =
  "Nhóm tuỳ chọn đã thay đổi sau khi xem trước. Vui lòng tạo tổ hợp lại.";
