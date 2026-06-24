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
  isUuid,
  buildOptionValueRef,
} from "@/features/products/product-variant-matrix.utils";
import {
  countVariantsUsingOption,
  countVariantsUsingOptionValue,
} from "@/features/products/product-variant-matrix.service";
import type { ProductAttributeAssignmentInput } from "@/features/products/product-attribute-assignment.utils";

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

  return refs.map((ref) => {
    if (isUuid(ref) && byId.has(ref)) return ref;
    const resolved = byRef.get(ref);
    if (resolved) return resolved;
    if (isUuid(ref)) throwProductRelationOwnershipError();
    return ref;
  });
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

    const existingOptions = await db.productOption.findMany({
      where: { productId },
      include: { values: { select: { id: true } } },
    });
    const keepOptionIds = new Set(
      data.options.map((o) => o.id).filter(Boolean) as string[],
    );
    for (const existing of existingOptions) {
      if (keepOptionIds.has(existing.id)) continue;
      const usage = await countVariantsUsingOption(existing.id, db);
      if (usage > 0) {
        throw new ProductAdminValidationError(
          `Không thể xóa nhóm "${existing.name}" vì ${usage} biến thể đang dùng giá trị trong nhóm này.`,
          { options: "Nhóm biến thể đang được sử dụng." },
        );
      }
    }

    const deleteOptionIds = existingOptions
      .map((o) => o.id)
      .filter((id) => !keepOptionIds.has(id));

    if (deleteOptionIds.length) {
      await deleteProductOptionsOwned(db, productId, deleteOptionIds);
    }

    for (const [optIndex, option] of data.options.entries()) {
      const slug = option.slug?.trim() || toOptionSlug(option.name, `option-${optIndex + 1}`);
      if (option.id) {
        await updateProductOptionOwned(db, productId, option.id, {
          name: option.name.trim(),
          attributeId: option.attributeId ?? null,
          slug,
          sortOrder: option.sortOrder ?? optIndex,
        });
      }
      const savedOption = option.id
        ? { id: option.id }
        : await db.productOption.create({
            data: {
              productId,
              attributeId: option.attributeId ?? null,
              name: option.name.trim(),
              slug,
              sortOrder: option.sortOrder ?? optIndex,
            },
          });

      const existingValues = await db.productOptionValue.findMany({
        where: { optionId: savedOption.id },
        select: { id: true, label: true },
      });
      const keepValueIds = new Set(
        option.values.map((v) => v.id).filter(Boolean) as string[],
      );
      for (const existingValue of existingValues) {
        if (keepValueIds.has(existingValue.id)) continue;
        const usage = await countVariantsUsingOptionValue(existingValue.id, db);
        if (usage > 0) {
          throw new ProductAdminValidationError(
            `Không thể xóa giá trị "${existingValue.label}" vì ${usage} biến thể đang dùng giá trị này.`,
            { options: "Giá trị biến thể đang được sử dụng." },
          );
        }
      }
      const deleteValueIds = existingValues
        .map((v) => v.id)
        .filter((id) => !keepValueIds.has(id));
      if (deleteValueIds.length) {
        await deleteProductOptionValuesOwned(db, productId, savedOption.id, deleteValueIds);
      }

      for (const [valIndex, value] of option.values.entries()) {
        if (value.id) {
          await updateProductOptionValueOwned(db, productId, savedOption.id, value.id, {
            label: value.label.trim(),
            attributeValueId: value.attributeValueId ?? null,
            valueCode: value.valueCode?.trim() || null,
            imageUrl: value.imageUrl?.trim() || null,
            sortOrder: value.sortOrder ?? valIndex,
          });
        }
      }

      const newValues = option.values
        .map((value, valIndex) => ({ value, valIndex }))
        .filter(({ value }) => !value.id);
      if (newValues.length) {
        await db.productOptionValue.createMany({
          data: newValues.map(({ value, valIndex }) => ({
            optionId: savedOption.id,
            attributeValueId: value.attributeValueId ?? null,
            label: value.label.trim(),
            valueCode: value.valueCode?.trim() || null,
            imageUrl: value.imageUrl?.trim() || null,
            sortOrder: value.sortOrder ?? valIndex,
          })),
        });
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

    const existing = await db.productSpecification.findMany({
      where: { productId },
      select: { id: true },
    });
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
        specUpdates.push({ id: spec.id, label, value, sortOrder });
      } else {
        specCreates.push({ productId, label, value, sortOrder });
      }
    }

    if (deleteIds.length) {
      await deleteProductSpecificationsOwned(db, productId, deleteIds);
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

    const existing = await db.productCustomizationCapability.findMany({
      where: { productId },
      select: { id: true },
    });
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
        customizationUpdates.push({ id: cap.id, label, description, sortOrder, enabled });
      } else {
        customizationCreates.push({ productId, label, description, sortOrder, enabled });
      }
    }

    if (deleteIds.length) {
      await deleteProductCustomizationsOwned(db, productId, deleteIds);
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

    for (const [variantId, valueIds] of Object.entries(data.variantOptionValueIds)) {
      await db.productVariantOptionValue.deleteMany({
        where: { variantId, variant: { productId } },
      });
      if (!valueIds.length) continue;
      await db.productVariantOptionValue.createMany({
        data: valueIds.map((optionValueId) => ({ variantId, optionValueId })),
        skipDuplicates: true,
      });
    }
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
