import { prisma } from "@/lib/prisma";
import type { ProductPriceTierRecord } from "@/features/pricing/types";
import { PricingValidationError } from "@/features/pricing/services/price-group.service";
import { TIER_VARIANT_OWNERSHIP_ERROR } from "@/features/products/product-foundation-validation";

function mapTier(row: {
  id: string;
  productId: string;
  variantId: string | null;
  priceGroupId: string;
  minQuantity: number;
  maxQuantity: number | null;
  unitPrice: { toNumber(): number };
  costPrice: { toNumber(): number } | null;
  currency: string;
  effectiveFrom: Date | null;
  effectiveTo: Date | null;
  isActive: boolean;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
  product?: { name: string };
  variant?: { sku: string; colorName: string | null; sizeName: string | null } | null;
  priceGroup?: { name: string; code: string };
}): ProductPriceTierRecord {
  const variantLabel = row.variant
    ? [row.variant.sku, row.variant.colorName, row.variant.sizeName].filter(Boolean).join(" · ")
    : null;
  return {
    id: row.id,
    productId: row.productId,
    variantId: row.variantId,
    priceGroupId: row.priceGroupId,
    minQuantity: row.minQuantity,
    maxQuantity: row.maxQuantity,
    unitPrice: row.unitPrice.toNumber(),
    costPrice: row.costPrice?.toNumber() ?? null,
    currency: row.currency,
    effectiveFrom: row.effectiveFrom?.toISOString() ?? null,
    effectiveTo: row.effectiveTo?.toISOString() ?? null,
    isActive: row.isActive,
    note: row.note,
    productName: row.product?.name,
    variantLabel: variantLabel ?? undefined,
    priceGroupName: row.priceGroup?.name,
    priceGroupCode: row.priceGroup?.code,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function validateTierQuantities(minQuantity: number, maxQuantity: number | null) {
  if (minQuantity < 1) throw new PricingValidationError("Số lượng từ phải >= 1.");
  if (maxQuantity != null && maxQuantity < minQuantity) {
    throw new PricingValidationError("Số lượng đến phải >= số lượng từ.");
  }
}

export async function assertVariantBelongsToProduct(
  productId: string,
  variantId: string | null | undefined,
  db: Pick<typeof prisma, "productVariant"> = prisma,
): Promise<void> {
  if (!variantId) return;
  const variant = await db.productVariant.findFirst({
    where: { id: variantId, productId },
    select: { id: true },
  });
  if (!variant) {
    throw new PricingValidationError(TIER_VARIANT_OWNERSHIP_ERROR);
  }
}

export async function listProductPriceTiers(params?: {
  productId?: string;
  priceGroupId?: string;
  search?: string;
  activeOnly?: boolean;
}) {
  const rows = await prisma.productPriceTier.findMany({
    where: {
      productId: params?.productId,
      priceGroupId: params?.priceGroupId,
      isActive: params?.activeOnly ? true : undefined,
      ...(params?.search?.trim()
        ? {
            product: {
              name: { contains: params.search.trim(), mode: "insensitive" as const },
            },
          }
        : {}),
    },
    include: {
      product: { select: { name: true } },
      variant: { select: { sku: true, colorName: true, sizeName: true } },
      priceGroup: { select: { name: true, code: true } },
    },
    orderBy: [{ product: { name: "asc" } }, { minQuantity: "asc" }],
  });
  return { tiers: rows.map(mapTier), total: rows.length };
}

export async function createProductPriceTier(input: {
  productId: string;
  variantId?: string | null;
  priceGroupId: string;
  minQuantity: number;
  maxQuantity?: number | null;
  unitPrice: number;
  costPrice?: number | null;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  note?: string | null;
  isActive?: boolean;
}) {
  if (!input.productId) throw new PricingValidationError("Sản phẩm là bắt buộc.");
  if (!input.priceGroupId) throw new PricingValidationError("Nhóm giá là bắt buộc.");
  if (input.unitPrice < 0) throw new PricingValidationError("Đơn giá phải >= 0.");
  validateTierQuantities(input.minQuantity, input.maxQuantity ?? null);
  await assertVariantBelongsToProduct(input.productId, input.variantId ?? null);

  const row = await prisma.productPriceTier.create({
    data: {
      productId: input.productId,
      variantId: input.variantId || null,
      priceGroupId: input.priceGroupId,
      minQuantity: input.minQuantity,
      maxQuantity: input.maxQuantity ?? null,
      unitPrice: input.unitPrice,
      costPrice: input.costPrice ?? null,
      effectiveFrom: input.effectiveFrom ? new Date(input.effectiveFrom) : null,
      effectiveTo: input.effectiveTo ? new Date(input.effectiveTo) : null,
      note: input.note?.trim() || null,
      isActive: input.isActive ?? true,
    },
    include: {
      product: { select: { name: true } },
      variant: { select: { sku: true, colorName: true, sizeName: true } },
      priceGroup: { select: { name: true, code: true } },
    },
  });
  return mapTier(row);
}

export async function updateProductPriceTier(
  id: string,
  input: {
    variantId?: string | null;
    priceGroupId?: string;
    minQuantity?: number;
    maxQuantity?: number | null;
    unitPrice?: number;
    costPrice?: number | null;
    effectiveFrom?: string | null;
    effectiveTo?: string | null;
    note?: string | null;
    isActive?: boolean;
  }
) {
  const existing = await prisma.productPriceTier.findUnique({ where: { id } });
  if (!existing) throw new PricingValidationError("Không tìm thấy dòng giá.");

  const minQuantity = input.minQuantity ?? existing.minQuantity;
  const maxQuantity = input.maxQuantity !== undefined ? input.maxQuantity : existing.maxQuantity;
  validateTierQuantities(minQuantity, maxQuantity);
  if (input.unitPrice !== undefined && input.unitPrice < 0) {
    throw new PricingValidationError("Đơn giá phải >= 0.");
  }

  const nextVariantId = input.variantId !== undefined ? (input.variantId || null) : existing.variantId;
  await assertVariantBelongsToProduct(existing.productId, nextVariantId);

  const row = await prisma.productPriceTier.update({
    where: { id },
    data: {
      variantId: input.variantId !== undefined ? (input.variantId || null) : undefined,
      priceGroupId: input.priceGroupId,
      minQuantity: input.minQuantity,
      maxQuantity: input.maxQuantity !== undefined ? input.maxQuantity : undefined,
      unitPrice: input.unitPrice,
      costPrice: input.costPrice !== undefined ? input.costPrice : undefined,
      effectiveFrom:
        input.effectiveFrom !== undefined
          ? input.effectiveFrom
            ? new Date(input.effectiveFrom)
            : null
          : undefined,
      effectiveTo:
        input.effectiveTo !== undefined
          ? input.effectiveTo
            ? new Date(input.effectiveTo)
            : null
          : undefined,
      note: input.note !== undefined ? (input.note?.trim() || null) : undefined,
      isActive: input.isActive,
    },
    include: {
      product: { select: { name: true } },
      variant: { select: { sku: true, colorName: true, sizeName: true } },
      priceGroup: { select: { name: true, code: true } },
    },
  });
  return mapTier(row);
}

export async function getTiersForPricing(productIds: string[], priceGroupId: string) {
  return prisma.productPriceTier.findMany({
    where: {
      productId: { in: productIds },
      priceGroupId,
      isActive: true,
    },
  });
}
