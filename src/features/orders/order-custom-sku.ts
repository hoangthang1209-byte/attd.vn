import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getColorSkuCode } from "@/features/products/product-sku-utils";

type SkuParts = {
  customerCode: string;
  systemCode: string;
  colorName?: string | null;
  sizeName?: string | null;
};

function normalizeCodePart(value: string): string {
  return value.trim().toUpperCase();
}

export function buildOrderCustomSkuBase(parts: SkuParts): string {
  const segments = [
    normalizeCodePart(parts.customerCode),
    normalizeCodePart(parts.systemCode),
  ];
  if (parts.colorName?.trim()) {
    segments.push(getColorSkuCode(parts.colorName.trim()));
  }
  if (parts.sizeName?.trim()) {
    segments.push(
      parts.sizeName
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 8) || "VAR",
    );
  }
  return segments.join("-");
}

export async function allocateOrderCustomSku(
  parts: SkuParts,
  tx?: Prisma.TransactionClient,
): Promise<string> {
  const db = tx ?? prisma;
  const base = buildOrderCustomSkuBase(parts);
  let candidate = base;
  let sequence = 0;

  while (true) {
    const existing = await db.orderItem.findFirst({
      where: { skuSnapshot: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
    sequence += 1;
    candidate = `${base}-CUSTOM-${String(sequence).padStart(2, "0")}`;
    if (sequence > 999) {
      throw new Error("Không thể tạo mã SKU đơn hàng duy nhất.");
    }
  }
}
