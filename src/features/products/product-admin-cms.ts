import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ProductAdminValidationError } from "@/features/products/product-admin-input";
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
): Promise<string[]> {
  if (!refs.length) return [];

  const options = await prisma.productOption.findMany({
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
) {
  if (data.options) {
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

    const existingOptions = await prisma.productOption.findMany({
      where: { productId },
      include: { values: { select: { id: true } } },
    });
    const keepOptionIds = new Set(
      data.options.map((o) => o.id).filter(Boolean) as string[],
    );
    for (const existing of existingOptions) {
      if (keepOptionIds.has(existing.id)) continue;
      const usage = await countVariantsUsingOption(existing.id);
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
      await prisma.productOption.deleteMany({ where: { id: { in: deleteOptionIds } } });
    }

    for (const [optIndex, option] of data.options.entries()) {
      const slug = option.slug?.trim() || toOptionSlug(option.name, `option-${optIndex + 1}`);
      const savedOption = option.id
        ? await prisma.productOption.update({
            where: { id: option.id },
            data: {
              name: option.name.trim(),
              attributeId: option.attributeId ?? null,
              slug,
              sortOrder: option.sortOrder ?? optIndex,
            },
          })
        : await prisma.productOption.create({
            data: {
              productId,
              attributeId: option.attributeId ?? null,
              name: option.name.trim(),
              slug,
              sortOrder: option.sortOrder ?? optIndex,
            },
          });

      const existingValues = await prisma.productOptionValue.findMany({
        where: { optionId: savedOption.id },
        select: { id: true, label: true },
      });
      const keepValueIds = new Set(
        option.values.map((v) => v.id).filter(Boolean) as string[],
      );
      for (const existingValue of existingValues) {
        if (keepValueIds.has(existingValue.id)) continue;
        const usage = await countVariantsUsingOptionValue(existingValue.id);
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
        await prisma.productOptionValue.deleteMany({ where: { id: { in: deleteValueIds } } });
      }

      for (const [valIndex, value] of option.values.entries()) {
        if (value.id) {
          await prisma.productOptionValue.update({
            where: { id: value.id },
            data: {
              label: value.label.trim(),
              attributeValueId: value.attributeValueId ?? null,
              valueCode: value.valueCode?.trim() || null,
              imageUrl: value.imageUrl?.trim() || null,
              sortOrder: value.sortOrder ?? valIndex,
            },
          });
        } else {
          await prisma.productOptionValue.create({
            data: {
              optionId: savedOption.id,
              attributeValueId: value.attributeValueId ?? null,
              label: value.label.trim(),
              valueCode: value.valueCode?.trim() || null,
              imageUrl: value.imageUrl?.trim() || null,
              sortOrder: value.sortOrder ?? valIndex,
            },
          });
        }
      }
    }
  }

  if (data.specifications) {
    const existing = await prisma.productSpecification.findMany({
      where: { productId },
      select: { id: true },
    });
    const keepIds = new Set(data.specifications.map((s) => s.id).filter(Boolean) as string[]);
    const deleteIds = existing.map((s) => s.id).filter((id) => !keepIds.has(id));
    if (deleteIds.length) {
      await prisma.productSpecification.deleteMany({ where: { id: { in: deleteIds } } });
    }

    for (const [index, spec] of data.specifications.entries()) {
      if (!spec.label.trim() || !spec.value.trim()) continue;
      if (spec.id) {
        await prisma.productSpecification.update({
          where: { id: spec.id },
          data: {
            label: spec.label.trim(),
            value: spec.value.trim(),
            sortOrder: spec.sortOrder ?? index,
          },
        });
      } else {
        await prisma.productSpecification.create({
          data: {
            productId,
            label: spec.label.trim(),
            value: spec.value.trim(),
            sortOrder: spec.sortOrder ?? index,
          },
        });
      }
    }
  }

  if (data.customizations) {
    const existing = await prisma.productCustomizationCapability.findMany({
      where: { productId },
      select: { id: true },
    });
    const keepIds = new Set(data.customizations.map((c) => c.id).filter(Boolean) as string[]);
    const deleteIds = existing.map((c) => c.id).filter((id) => !keepIds.has(id));
    if (deleteIds.length) {
      await prisma.productCustomizationCapability.deleteMany({
        where: { id: { in: deleteIds } },
      });
    }

    for (const [index, cap] of data.customizations.entries()) {
      if (!cap.label.trim()) continue;
      if (cap.id) {
        await prisma.productCustomizationCapability.update({
          where: { id: cap.id },
          data: {
            label: cap.label.trim(),
            description: cap.description?.trim() || null,
            sortOrder: cap.sortOrder ?? index,
            enabled: cap.enabled ?? true,
          },
        });
      } else {
        await prisma.productCustomizationCapability.create({
          data: {
            productId,
            label: cap.label.trim(),
            description: cap.description?.trim() || null,
            sortOrder: cap.sortOrder ?? index,
            enabled: cap.enabled ?? true,
          },
        });
      }
    }
  }

  if (data.variantOptionValueIds) {
    const combos = Object.values(data.variantOptionValueIds).filter((combo) => combo.length);
    if (combos.length) {
      let optionsForValidation = data.options;
      if (!optionsForValidation) {
        const dbOptions = await prisma.productOption.findMany({
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
      await prisma.productVariantOptionValue.deleteMany({ where: { variantId } });
      if (!valueIds.length) continue;
      await prisma.productVariantOptionValue.createMany({
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
