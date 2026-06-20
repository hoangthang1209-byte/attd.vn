import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getColorSkuCode } from "@/features/products/product-sku-utils";

type VariantSkuParts = {
  customerCode: string;
  systemCode: string;
  colorName?: string | null;
  colorSlug?: string | null;
  sizeValue?: string | null;
};

function normalizeCodePart(value: string): string {
  return value.trim().toUpperCase();
}

function sanitizeSizeCode(size: string): string {
  const cleaned = size.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  return cleaned.slice(0, 8) || "VAR";
}

export function buildOrderItemVariantSkuBase(parts: VariantSkuParts): string {
  const segments = [
    normalizeCodePart(parts.customerCode),
    normalizeCodePart(parts.systemCode),
  ];
  if (parts.colorSlug?.trim()) {
    segments.push(normalizeCodePart(parts.colorSlug.replace(/-/g, "")));
  } else if (parts.colorName?.trim()) {
    segments.push(getColorSkuCode(parts.colorName.trim()));
  }
  if (parts.sizeValue?.trim()) {
    segments.push(sanitizeSizeCode(parts.sizeValue));
  }
  return segments.join("-");
}

export async function allocateOrderItemVariantSku(
  parts: VariantSkuParts,
  orderItemId: string,
  tx?: Prisma.TransactionClient,
): Promise<string> {
  const db = tx ?? prisma;
  const base = buildOrderItemVariantSkuBase(parts);
  let candidate = base;
  let sequence = 0;

  while (true) {
    const existing = await db.orderItemVariant.findFirst({
      where: {
        OR: [
          { skuSnapshot: candidate },
          { orderItemId, skuSnapshot: candidate },
        ],
      },
      select: { id: true },
    });
    if (!existing) return candidate;
    sequence += 1;
    candidate = `${base}-${String(sequence).padStart(2, "0")}`;
    if (sequence > 999) {
      throw new Error("Không thể tạo mã SKU biến thể duy nhất.");
    }
  }
}
