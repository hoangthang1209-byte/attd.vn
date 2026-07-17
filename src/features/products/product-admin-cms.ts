import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ProductAdminValidationError } from "@/features/products/product-admin-input";
import {
  assertNoDuplicateRelationIds,
  assertOptionIdsBelongToProduct,
  assertOptionValueIdsBelongToProduct,
  assertSpecificationIdsBelongToProduct,
  assertCustomizationIdsBelongToProduct,
  assertVariantOptionValueLinksBelongToProduct,
  deleteProductCustomizationsOwned,
  deleteProductOptionValuesOwned,
  deleteProductOptionsOwned,
  deleteProductSpecificationsOwned,
  throwProductRelationOwnershipError,
  updateProductCustomizationOwned,
  updateProductOptionOwned,
  updateProductOptionValueOwned,
  updateProductSpecificationOwned,
  type DbClient,
} from "@/features/products/product-relation-ownership";
import {
  validateOptionGroupNames,
  validateOptionValues,
  normalizeOptionName,
  buildOptionValueRef,
} from "@/features/products/product-variant-matrix.utils";
import {
  findMatchingOptionGroup,
  findMatchingOptionValue,
} from "@/features/products/product-option-persistence";
import { isPersistedProductRelationId } from "@/features/products/product-relation-ids";
import type { ProductAttributeAssignmentInput } from "@/features/products/product-attribute-assignment.utils";
import type { ExistingProductRelationState } from "@/features/products/product-save-relation-diff";
import {
  customizationNeedsUpdate,
  optionGroupNeedsUpdate,
  optionValueNeedsUpdate,
  specificationNeedsUpdate,
  variantOptionLinksNeedUpdate,
} from "@/features/products/product-save-relation-diff";

export type ProductOptionValueInput = {
  id?: string;
  attributeValueId?: string | null;
  label: string;
  valueCode?: string | null;
  imageUrl?: string | null;
  sortOrder?: number;
};

export type ProductOptionInput = {
  id?: string;
  attributeId?: string | null;
  name: string;
  slug?: string;
  sortOrder?: number;
  values: ProductOptionValueInput[];
};

export type ProductSpecificationInput = {
  id?: string;
  label: string;
  value: string;
  sortOrder?: number;
};

export type ProductCustomizationInput = {
  id?: string;
  label: string;
  description?: string | null;
  sortOrder?: number;
  enabled?: boolean;
};

function toOptionSlug(name: string, fallback: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || fallback;
}

function validateOptionCombinations(
  options: ProductOptionInput[],
  variantOptionValueIds: string[][],
): void {
  if (!options.length || !variantOptionValueIds.length) return;

  const valueToOption = new Map<string, string>();
  for (const opt of options) {
    for (const val of opt.values) {
      const key = val.id ?? `${opt.slug ?? opt.name}:${val.label}`;
      valueToOption.set(key, opt.id ?? opt.slug ?? opt.name);
    }
  }

  const seen = new Set<string>();
  for (const combo of variantOptionValueIds) {
    const signature = combo.slice().sort().join("|");
    if (seen.has(signature)) {
      throw new ProductAdminValidationError(
        "Không thể lưu sản phẩm. Tồn tại biến thể trùng tổ hợp thuộc tính.",
        { variants: "Tổ hợp biến thể bị trùng." },
      );
    }
    seen.add(signature);

    const optionIds = new Set<string>();
    for (const valueId of combo) {
      const optionId = valueToOption.get(valueId);
      if (!optionId) continue;
      if (optionIds.has(optionId)) {
        throw new ProductAdminValidationError(
          "Không thể lưu sản phẩm. Mỗi biến thể chỉ được chọn một giá trị cho mỗi nhóm thuộc tính.",
          { variants: "Tổ hợp thuộc tính biến thể không hợp lệ." },
        );
      }
      optionIds.add(optionId);
    }
  }
}

function buildOptionValueRefMaps(
  options: Array<{
    id: string;
    name: string;
    slug: string;
    values: Array<{ id: string; label: string }>;
  }>,
) {
  const byId = new Map<string, string>();
  const byRef = new Map<string, string>();

  for (const option of options) {
    for (const value of option.values) {
      byId.set(value.id, value.id);
      byRef.set(buildOptionValueRef(option.slug, value.label), value.id);
      byRef.set(buildOptionValueRef(option.name, value.label), value.id);
      byRef.set(
        `${normalizeOptionName(option.slug)}::${normalizeOptionName(value.label)}`,
        value.id,
      );
    }
  }

  return { byId, byRef };
}

export function resolveOptionValueRefsFromLoadedOptions(
  options: Array<{
    id: string;
    name: string;
    slug: string;
    values: Array<{ id: string; label: string }>;
  }>,
  refs: string[],
): string[] {
  if (!refs.length) return [];
  const { byId, byRef } = buildOptionValueRefMaps(options);
  return refs.map((ref) => {
    if (isPersistedProductRelationId(ref) && byId.has(ref)) return ref;
    const resolved = byRef.get(ref);
    if (resolved) return resolved;
    if (isPersistedProductRelationId(ref)) throwProductRelationOwnershipError();
    return ref;
  });
}

async function assertRemovedOptionsNotInUse(
  db: DbClient,
  productId: string,
  removedOptions: Array<{ id: string; name: string }>,
): Promise<void> {
  if (!removedOptions.length) return;

  const links = await db.productVariantOptionValue.findMany({
    where: {
      optionValue: { optionId: { in: removedOptions.map((option) => option.id) } },
      variant: { productId },
    },
    select: {
      variantId: true,
      optionValue: { select: { optionId: true } },
    },
  });

  const variantCountByOption = new Map<string, Set<string>>();
  for (const link of links) {
    const optionId = link.optionValue.optionId;
    const set = variantCountByOption.get(optionId) ?? new Set<string>();
    set.add(link.variantId);
    variantCountByOption.set(optionId, set);
  }

  for (const option of removedOptions) {
    const usage = variantCountByOption.get(option.id)?.size ?? 0;
    if (usage > 0) {
      throw new ProductAdminValidationError(
        `Không thể xóa nhóm "${option.name}" vì ${usage} biến thể đang dùng giá trị trong nhóm này.`,
        { options: "Nhóm biến thể đang được sử dụng." },
      );
    }
  }
}

async function assertRemovedOptionValuesNotInUse(
  db: DbClient,
  productId: string,
  removedValues: Array<{ id: string; label: string }>,
): Promise<void> {
  if (!removedValues.length) return;

  const links = await db.productVariantOptionValue.findMany({
    where: {
      optionValueId: { in: removedValues.map((value) => value.id) },
      variant: { productId },
    },
    select: { optionValueId: true, variantId: true },
  });

  const variantCountByValue = new Map<string, Set<string>>();
  for (const link of links) {
    const set = variantCountByValue.get(link.optionValueId) ?? new Set<string>();
    set.add(link.variantId);
    variantCountByValue.set(link.optionValueId, set);
  }

  for (const value of removedValues) {
    const usage = variantCountByValue.get(value.id)?.size ?? 0;
    if (usage > 0) {
      throw new ProductAdminValidationError(
        `Không thể xóa giá trị "${value.label}" vì ${usage} biến thể đang dùng giá trị này.`,
        { options: "Giá trị biến thể đang được sử dụng." },
      );
    }
  }
}

export async function resolveOptionValueIdsForProduct(
  productId: string,
  refs: string[],
  db: DbClient = prisma,
): Promise<string[]> {
  if (!refs.length) return [];

  const options = await db.productOption.findMany({
    where: { productId },
    include: { values: true },
  });

  return resolveOptionValueRefsFromLoadedOptions(options, refs);
}

export async function syncProductCmsData(
  productId: string,
  data: {
  options?: ProductOptionInput[];
  specifications?: ProductSpecificationInput[];
  customizations?: ProductCustomizationInput[];
  attributeAssignments?: ProductAttributeAssignmentInput[];
  variantOptionValueIds?: Record<string, string[]>;
  },
  db: DbClient = prisma,
  syncOptions?: {
    existing?: Pick<ExistingProductRelationState, "options" | "specifications" | "customizations" | "variants">;
  },
) {
  if (data.options) {
    assertNoDuplicateRelationIds(data.options.map((option) => option.id));
    for (const option of data.options) {
      assertNoDuplicateRelationIds(option.values.map((value) => value.id));
    }
    await assertOptionIdsBelongToProduct(
      db,
      productId,
      data.options.map((option) => option.id).filter(Boolean) as string[],
    );
    await assertOptionValueIdsBelongToProduct(
      db,
      productId,
      data.options.flatMap((option) => option.values.map((value) => value.id)).filter(Boolean) as string[],
    );

    validateOptionCombinations(
      data.options,
      Object.values(data.variantOptionValueIds ?? {}),
    );

    const nameError = validateOptionGroupNames(data.options);
    if (nameError) {
      throw new ProductAdminValidationError(nameError, { options: nameError });
    }
    const valueError = validateOptionValues(data.options);
    if (valueError) {
      throw new ProductAdminValidationError(valueError, { options: valueError });
    }

    const existingOptions =
      syncOptions?.existing?.options ??
      (await db.productOption.findMany({
        where: { productId },
        include: { values: { select: { id: true, label: true, valueCode: true, imageUrl: true, sortOrder: true, attributeValueId: true } } },
      }));
    const existingOptionById = new Map(existingOptions.map((option) => [option.id, option]));
    const existingValueById = new Map<
      string,
      {
        id: string;
        optionId: string;
        label: string;
        valueCode: string | null;
        imageUrl: string | null;
        sortOrder: number;
        attributeValueId: string | null;
      }
    >();
    for (const option of existingOptions) {
      for (const value of option.values) {
        existingValueById.set(value.id, { ...value, optionId: option.id });
      }
    }

    // Resolve incoming groups to existing rows by id / slug / name BEFORE deleting,
    // so options-only saves without client IDs stay idempotent (no delete+recreate).
    const claimedOptionIds = new Set<string>();
    const resolvedGroups: Array<{
      incoming: (typeof data.options)[number];
      optIndex: number;
      slug: string;
      existingGroup: (typeof existingOptions)[number] | undefined;
      savedOptionId: string;
    }> = [];

    for (const [optIndex, option] of data.options.entries()) {
      const slug = option.slug?.trim() || toOptionSlug(option.name, `option-${optIndex + 1}`);
      const matched = findMatchingOptionGroup(
        { id: option.id, name: option.name, slug },
        existingOptions,
        claimedOptionIds,
      );
      if (matched) claimedOptionIds.add(matched.id);

      let savedOptionId = matched?.id;
      const existingGroup = matched
        ? existingOptionById.get(matched.id) ?? existingOptions.find((row) => row.id === matched.id)
        : undefined;

      if (matched) {
        if (!existingGroup || optionGroupNeedsUpdate(option, existingGroup, optIndex)) {
          await updateProductOptionOwned(db, productId, matched.id, {
            name: option.name.trim(),
            attributeId: option.attributeId ?? null,
            slug,
            sortOrder: option.sortOrder ?? optIndex,
          });
        }
        savedOptionId = matched.id;
      } else {
        const created = await db.productOption.create({
          data: {
            productId,
            attributeId: option.attributeId ?? null,
            name: option.name.trim(),
            slug,
            sortOrder: option.sortOrder ?? optIndex,
          },
        });
        savedOptionId = created.id;
      }

      resolvedGroups.push({
        incoming: option,
        optIndex,
        slug,
        existingGroup,
        savedOptionId: savedOptionId!,
      });
    }

    const deleteOptionIds = existingOptions
      .map((option) => option.id)
      .filter((id) => !claimedOptionIds.has(id));

    if (deleteOptionIds.length) {
      await assertRemovedOptionsNotInUse(
        db,
        productId,
        existingOptions
          .filter((option) => deleteOptionIds.includes(option.id))
          .map((option) => ({ id: option.id, name: option.name })),
      );
      await deleteProductOptionsOwned(db, productId, deleteOptionIds);
    }

    for (const resolved of resolvedGroups) {
      const { incoming: option, existingGroup, savedOptionId } = resolved;
      const existingValues = existingGroup?.values ?? [];
      const claimedValueIds = new Set<string>();
      const valueUpdates: Array<Promise<void>> = [];
      const valueCreates: Array<{
        attributeValueId: string | null;
        label: string;
        valueCode: string | null;
        imageUrl: string | null;
        sortOrder: number;
      }> = [];

      for (const [valIndex, value] of option.values.entries()) {
        const matchedValue = findMatchingOptionValue(
          {
            id: value.id,
            label: value.label,
            valueCode: value.valueCode,
          },
          existingValues,
          claimedValueIds,
        );

        if (matchedValue) {
          claimedValueIds.add(matchedValue.id);
          const existingValue = existingValueById.get(matchedValue.id);
          if (existingValue && !optionValueNeedsUpdate(value, existingValue, valIndex)) {
            continue;
          }
          valueUpdates.push(
            updateProductOptionValueOwned(db, productId, savedOptionId, matchedValue.id, {
              label: value.label.trim(),
              attributeValueId: value.attributeValueId ?? null,
              valueCode: value.valueCode?.trim() || null,
              imageUrl: value.imageUrl?.trim() || null,
              sortOrder: value.sortOrder ?? valIndex,
            }),
          );
          continue;
        }

        valueCreates.push({
          attributeValueId: value.attributeValueId ?? null,
          label: value.label.trim(),
          valueCode: value.valueCode?.trim() || null,
          imageUrl: value.imageUrl?.trim() || null,
          sortOrder: value.sortOrder ?? valIndex,
        });
      }

      if (valueUpdates.length) {
        await Promise.all(valueUpdates);
      }
      if (valueCreates.length) {
        await db.productOptionValue.createMany({
          data: valueCreates.map((row) => ({
            optionId: savedOptionId,
            ...row,
          })),
        });
      }

      const deleteValueIds = existingValues
        .map((value) => value.id)
        .filter((id) => !claimedValueIds.has(id));
      if (deleteValueIds.length) {
        await assertRemovedOptionValuesNotInUse(
          db,
          productId,
          existingValues
            .filter((value) => deleteValueIds.includes(value.id))
            .map((value) => ({ id: value.id, label: value.label })),
        );
        await deleteProductOptionValuesOwned(db, productId, savedOptionId, deleteValueIds);
      }
    }
  }

  if (data.specifications) {
    assertNoDuplicateRelationIds(data.specifications.map((spec) => spec.id));
    await assertSpecificationIdsBelongToProduct(
      db,
      productId,
      data.specifications.map((spec) => spec.id).filter(Boolean) as string[],
    );

    const existing =
      syncOptions?.existing?.specifications ??
      (await db.productSpecification.findMany({
        where: { productId },
        select: { id: true, label: true, value: true, sortOrder: true },
      }));
    const existingSpecById = new Map(existing.map((row) => [row.id, row]));
    const keepIds = new Set(data.specifications.map((s) => s.id).filter(Boolean) as string[]);
    const deleteIds = existing.map((s) => s.id).filter((id) => !keepIds.has(id));
    if (deleteIds.length) {
      await deleteProductSpecificationsOwned(db, productId, deleteIds);
    }

    const specCreates: Prisma.ProductSpecificationCreateManyInput[] = [];
    const specUpdates: Array<{
      id: string;
      label: string;
      value: string;
      sortOrder: number;
    }> = [];

    for (const [index, spec] of data.specifications.entries()) {
      if (!spec.label.trim() || !spec.value.trim()) continue;
      const label = spec.label.trim();
      const value = spec.value.trim();
      const sortOrder = spec.sortOrder ?? index;
      if (spec.id) {
        const existingRow = existingSpecById.get(spec.id);
        if (!existingRow || specificationNeedsUpdate(spec, existingRow, index)) {
          specUpdates.push({ id: spec.id, label, value, sortOrder });
        }
      } else {
        specCreates.push({ productId, label, value, sortOrder });
      }
    }

    if (specCreates.length) {
      await db.productSpecification.createMany({ data: specCreates });
    }

    if (specUpdates.length) {
      await Promise.all(
        specUpdates.map((row) =>
          updateProductSpecificationOwned(db, productId, row.id, {
            label: row.label,
            value: row.value,
            sortOrder: row.sortOrder,
          }),
        ),
      );
    }
  }

  if (data.customizations) {
    assertNoDuplicateRelationIds(data.customizations.map((cap) => cap.id));
    await assertCustomizationIdsBelongToProduct(
      db,
      productId,
      data.customizations.map((cap) => cap.id).filter(Boolean) as string[],
    );

    const existing =
      syncOptions?.existing?.customizations ??
      (await db.productCustomizationCapability.findMany({
        where: { productId },
        select: { id: true, label: true, description: true, sortOrder: true, enabled: true },
      }));
    const existingCustomizationById = new Map(existing.map((row) => [row.id, row]));
    const keepIds = new Set(data.customizations.map((c) => c.id).filter(Boolean) as string[]);
    const deleteIds = existing.map((c) => c.id).filter((id) => !keepIds.has(id));
    if (deleteIds.length) {
      await deleteProductCustomizationsOwned(db, productId, deleteIds);
    }

    const customizationCreates: Prisma.ProductCustomizationCapabilityCreateManyInput[] = [];
    const customizationUpdates: Array<{
      id: string;
      label: string;
      description: string | null;
      sortOrder: number;
      enabled: boolean;
    }> = [];

    for (const [index, cap] of data.customizations.entries()) {
      if (!cap.label.trim()) continue;
      const label = cap.label.trim();
      const description = cap.description?.trim() || null;
      const sortOrder = cap.sortOrder ?? index;
      const enabled = cap.enabled ?? true;
      if (cap.id) {
        const existingRow = existingCustomizationById.get(cap.id);
        if (!existingRow || customizationNeedsUpdate(cap, existingRow, index)) {
          customizationUpdates.push({ id: cap.id, label, description, sortOrder, enabled });
        }
      } else {
        customizationCreates.push({ productId, label, description, sortOrder, enabled });
      }
    }

    if (customizationCreates.length) {
      await db.productCustomizationCapability.createMany({ data: customizationCreates });
    }

    if (customizationUpdates.length) {
      await Promise.all(
        customizationUpdates.map((row) =>
          updateProductCustomizationOwned(db, productId, row.id, {
            label: row.label,
            description: row.description,
            sortOrder: row.sortOrder,
            enabled: row.enabled,
          }),
        ),
      );
    }
  }

  if (data.variantOptionValueIds) {
    await assertVariantOptionValueLinksBelongToProduct(db, productId, data.variantOptionValueIds);

    const combos = Object.values(data.variantOptionValueIds).filter((combo) => combo.length);
    if (combos.length) {
      let optionsForValidation = data.options;
      if (!optionsForValidation) {
        const dbOptions = await db.productOption.findMany({
          where: { productId },
          include: { values: { orderBy: { sortOrder: "asc" } } },
          orderBy: { sortOrder: "asc" },
        });
        optionsForValidation = dbOptions.map((option) => ({
          id: option.id,
          attributeId: option.attributeId,
          name: option.name,
          slug: option.slug,
          sortOrder: option.sortOrder,
          values: option.values.map((value) => ({
            id: value.id,
            attributeValueId: value.attributeValueId,
            label: value.label,
            valueCode: value.valueCode,
            imageUrl: value.imageUrl,
            sortOrder: value.sortOrder,
          })),
        }));
      }
      validateOptionCombinations(optionsForValidation, combos);
    }

    const existingLinksByVariant = new Map<string, string[]>();
    if (syncOptions?.existing?.variants?.length) {
      for (const variant of syncOptions.existing.variants) {
        existingLinksByVariant.set(variant.id, variant.optionValueIds);
      }
    } else {
      const variantIds = Object.keys(data.variantOptionValueIds);
      if (variantIds.length) {
        const links = await db.productVariantOptionValue.findMany({
          where: { variantId: { in: variantIds }, variant: { productId } },
          select: { variantId: true, optionValueId: true },
        });
        for (const link of links) {
          const current = existingLinksByVariant.get(link.variantId) ?? [];
          current.push(link.optionValueId);
          existingLinksByVariant.set(link.variantId, current);
        }
      }
    }

    await Promise.all(
      Object.entries(data.variantOptionValueIds).map(async ([variantId, valueIds]) => {
        const existingValueIds = existingLinksByVariant.get(variantId) ?? [];
        if (!variantOptionLinksNeedUpdate(valueIds, existingValueIds)) return;
        await db.productVariantOptionValue.deleteMany({
          where: { variantId, variant: { productId } },
        });
        if (!valueIds.length) return;
        await db.productVariantOptionValue.createMany({
          data: valueIds.map((optionValueId) => ({ variantId, optionValueId })),
          skipDuplicates: true,
        });
      }),
    );
  }
}

export const PRODUCT_CMS_INCLUDE = {
  options: {
    orderBy: { sortOrder: "asc" as const },
    include: { values: { orderBy: { sortOrder: "asc" as const } } },
  },
  specifications: { orderBy: { sortOrder: "asc" as const } },
  customizationCapabilities: { orderBy: { sortOrder: "asc" as const } },
  attributeAssignments: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      attribute: { select: { id: true, name: true, code: true, isSpecificationAttribute: true, isVariantAttribute: true } },
      attributeValue: { select: { id: true, name: true, status: true } },
    },
  },
} satisfies Prisma.ProductInclude;
