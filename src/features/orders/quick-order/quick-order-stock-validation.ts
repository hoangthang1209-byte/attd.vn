import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { OrderValidationError } from "@/features/orders/order.service";
import {
  buildQuickOrderColorDisplaySnapshot,
  sanitizeQuickOrderColorCode,
  sanitizeQuickOrderColorName,
} from "@/features/orders/quick-order/quick-order-color";
import { normalizeSizeForStockMatch } from "@/features/orders/quick-order/quick-order-sizes";
import type { OrderItemInput } from "@/features/orders/order-totals";

type StockVariantRow = {
  colorId: string | null;
  colorName: string | null;
  sizeName: string | null;
};

function normalizeColorLookup(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

export function sanitizeOrderColorSnapshot(value: string): string {
  return buildQuickOrderColorDisplaySnapshot({
    colorName: sanitizeQuickOrderColorName(value),
    colorCode: null,
  });
}

export async function validateStockBackedOrderItem(
  item: OrderItemInput,
  db: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<void> {
  if (item.supplySource !== "ATTD_STOCK") return;

  if (!item.productId) {
    throw new OrderValidationError("Sản phẩm lấy từ Kho ATTD cần chọn sản phẩm có trong kho.");
  }

  const stockVariants: StockVariantRow[] = await db.productVariant.findMany({
    where: { productId: item.productId },
    select: { colorId: true, colorName: true, sizeName: true },
  });

  const activeVariants = (item.variants ?? []).filter((v) => Math.max(0, Math.floor(v.quantity)) > 0);

  if (activeVariants.length === 0) {
    if (!item.colorId) {
      throw new OrderValidationError("Sản phẩm lấy từ Kho ATTD cần chọn màu có trong kho.");
    }
    return;
  }

  for (const variant of activeVariants) {
    const variantColorId = variant.colorId ?? item.colorId;
    if (!variantColorId) {
      throw new OrderValidationError("Sản phẩm lấy từ Kho ATTD cần chọn màu có trong kho.");
    }

    const color = await db.color.findUnique({
      where: { id: variantColorId },
      select: { name: true },
    });
    if (!color) {
      throw new OrderValidationError("Sản phẩm lấy từ Kho ATTD cần chọn màu có trong kho.");
    }

    const sizeValue = variant.sizeValue?.trim() || "";
    const normalizedOrderSize = normalizeSizeForStockMatch(sizeValue);
    const displaySize =
      normalizedOrderSize === "Free size" ? "Free" : sizeValue || normalizedOrderSize;

    const hasMatch = stockVariants.some((stock) => {
      const colorMatch =
        stock.colorId === variantColorId ||
        normalizeColorLookup(stock.colorName) === normalizeColorLookup(color.name) ||
        (variant.colorNameSnapshot &&
          normalizeColorLookup(stock.colorName) === normalizeColorLookup(variant.colorNameSnapshot));
      const stockSize = normalizeSizeForStockMatch(stock.sizeName);
      return colorMatch && stockSize === normalizedOrderSize;
    });

    if (!hasMatch) {
      throw new OrderValidationError(`Size ${displaySize} không có trong kho cho sản phẩm này.`);
    }
  }
}

export function resolveOrderItemColorSnapshot(
  item: OrderItemInput,
  resolvedCatalogColorName?: string | null,
): string | null {
  if (item.colorId && resolvedCatalogColorName) {
    return resolvedCatalogColorName;
  }
  if (!item.colorSnapshot?.trim()) return null;
  return sanitizeOrderColorSnapshot(item.colorSnapshot);
}

export function sanitizeQuickOrderColorFields(input: {
  colorName: string;
  colorCode?: string | null;
}): { colorName: string; colorCode: string; displaySnapshot: string } {
  const colorName = sanitizeQuickOrderColorName(input.colorName);
  const colorCode = sanitizeQuickOrderColorCode(input.colorCode ?? "");
  return {
    colorName,
    colorCode,
    displaySnapshot: buildQuickOrderColorDisplaySnapshot({ colorName, colorCode }),
  };
}
