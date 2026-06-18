import { prisma } from "@/lib/prisma";
import { buildProductInterestSnapshot, formatVariantLabel } from "@/features/crm/product-interest-utils";
import type { CreateProductInterestInput } from "@/features/crm/types";

export async function resolveProductInterestSnapshot(
  input: CreateProductInterestInput
): Promise<string | null> {
  const custom = input.productNameSnapshot?.trim();
  if (custom && !input.productId) return custom;

  if (!input.productId) {
    return custom || null;
  }

  const product = await prisma.product.findUnique({
    where: { id: input.productId },
    select: { name: true },
  });
  if (!product) return custom || null;

  if (input.variantId) {
    const variant = await prisma.productVariant.findUnique({
      where: { id: input.variantId },
      select: {
        sku: true,
        colorName: true,
        sizeName: true,
        dimensions: true,
        capacity: true,
      },
    });
    if (variant) {
      return buildProductInterestSnapshot(product.name, {
        id: input.variantId,
        sku: variant.sku,
        colorName: variant.colorName,
        sizeName: variant.sizeName,
        dimensions: variant.dimensions,
        capacity: variant.capacity,
      });
    }
  }

  return custom || product.name;
}

export { formatVariantLabel, buildProductInterestSnapshot };
