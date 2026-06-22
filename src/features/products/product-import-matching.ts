import { prisma } from "@/lib/prisma";
import type { ProductImportRow } from "@/features/products/product-import-types";
import {
  normalizeOptionComboSignature,
  parseStructuredOptionValues,
  type ParsedOptionPair,
} from "@/features/products/product-import-options-parser";

export type MatchedProduct = {
  id: string;
  productCode: string | null;
  systemCode: string | null;
  slug: string;
  name: string;
};

export type MatchedVariant = {
  id: string;
  sku: string;
  productId: string;
  variantStatus: string;
  optionValueIds: string[];
};

export async function matchProductByIdentifiers(
  row: Pick<
    ProductImportRow,
    "productCode" | "systemCode" | "slug" | "productId"
  >,
): Promise<MatchedProduct | null> {
  if (row.productId?.trim()) {
    const byId = await prisma.product.findUnique({
      where: { id: row.productId.trim() },
      select: { id: true, productCode: true, systemCode: true, slug: true, name: true },
    });
    if (byId) return byId;
  }

  if (row.productCode?.trim()) {
    const byCode = await prisma.product.findUnique({
      where: { productCode: row.productCode.trim().toUpperCase() },
      select: { id: true, productCode: true, systemCode: true, slug: true, name: true },
    });
    if (byCode) return byCode;
  }

  if (row.systemCode?.trim()) {
    const bySystem = await prisma.product.findFirst({
      where: { systemCode: row.systemCode.trim() },
      select: { id: true, productCode: true, systemCode: true, slug: true, name: true },
    });
    if (bySystem) return bySystem;
  }

  if (row.slug?.trim()) {
    const bySlug = await prisma.product.findUnique({
      where: { slug: row.slug.trim() },
      select: { id: true, productCode: true, systemCode: true, slug: true, name: true },
    });
    if (bySlug) return bySlug;
  }

  return null;
}

export async function matchVariantForProduct(
  productId: string,
  row: Pick<
    ProductImportRow,
    "sku" | "optionValues" | "colorName" | "sizeName"
  >,
): Promise<{ variant: MatchedVariant | null; optionPairs: ParsedOptionPair[] }> {
  const optionPairs = row.optionValues ? parseStructuredOptionValues(row.optionValues) : [];

  if (row.sku?.trim()) {
    const bySku = await prisma.productVariant.findUnique({
      where: { sku: row.sku.trim() },
      select: {
        id: true,
        sku: true,
        productId: true,
        variantStatus: true,
        optionValues: { select: { optionValueId: true } },
      },
    });
    if (bySku) {
      if (bySku.productId !== productId) return { variant: null, optionPairs };
      return {
        variant: {
          ...bySku,
          optionValueIds: bySku.optionValues.map((v) => v.optionValueId),
        },
        optionPairs,
      };
    }
  }

  if (optionPairs.length) {
    const variant = await findVariantByOptionCombination(productId, optionPairs);
    if (variant) return { variant, optionPairs };
  }

  if (row.colorName?.trim() || row.sizeName?.trim()) {
    const legacy = await prisma.productVariant.findFirst({
      where: {
        productId,
        colorName: row.colorName?.trim() || undefined,
        sizeName: row.sizeName?.trim() || undefined,
      },
      select: {
        id: true,
        sku: true,
        productId: true,
        variantStatus: true,
        optionValues: { select: { optionValueId: true } },
      },
    });
    if (legacy) {
      return {
        variant: {
          ...legacy,
          optionValueIds: legacy.optionValues.map((v) => v.optionValueId),
        },
        optionPairs,
      };
    }
  }

  return { variant: null, optionPairs };
}

async function findVariantByOptionCombination(
  productId: string,
  pairs: ParsedOptionPair[],
): Promise<MatchedVariant | null> {
  const signature = normalizeOptionComboSignature(pairs);
  if (!signature) return null;

  const options = await prisma.productOption.findMany({
    where: { productId },
    include: { values: true },
  });

  const valueIdByPair = new Map<string, string>();
  for (const option of options) {
    for (const value of option.values) {
      valueIdByPair.set(
        `${option.name.trim().toLowerCase()}=${value.label.trim().toLowerCase()}`,
        value.id,
      );
      valueIdByPair.set(
        `${option.slug.trim().toLowerCase()}=${value.label.trim().toLowerCase()}`,
        value.id,
      );
    }
  }

  const targetIds: string[] = [];
  for (const pair of pairs) {
    const key = `${pair.group.trim().toLowerCase()}=${pair.value.trim().toLowerCase()}`;
    const id = valueIdByPair.get(key);
    if (!id) return null;
    targetIds.push(id);
  }

  const variants = await prisma.productVariant.findMany({
    where: { productId },
    select: {
      id: true,
      sku: true,
      productId: true,
      variantStatus: true,
      optionValues: { select: { optionValueId: true } },
    },
  });

  const targetSig = [...targetIds].sort().join("|");
  for (const variant of variants) {
    const sig = variant.optionValues
      .map((v) => v.optionValueId)
      .sort()
      .join("|");
    if (sig === targetSig) {
      return {
        ...variant,
        optionValueIds: variant.optionValues.map((v) => v.optionValueId),
      };
    }
  }

  return null;
}
