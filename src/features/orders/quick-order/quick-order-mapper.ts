import type { OrderItemInput } from "@/features/orders/order-totals";
import {
  buildQuickOrderColorDisplaySnapshot,
  isValidQuickOrderColorName,
  requiresCatalogColor,
  sanitizeQuickOrderColorCode,
  sanitizeQuickOrderColorName,
} from "@/features/orders/quick-order/quick-order-color";
import {
  sizeColumnLabelToVariantSizeValue,
  sumQuickOrderSizeQuantities,
  type QuickOrderSizeColumn,
} from "@/features/orders/quick-order/quick-order-sizes";
import {
  sumQuickOrderSizes,
  type QuickOrderGridRow,
} from "@/features/orders/quick-order/quick-order.types";

export type QuickOrderRowValidationContext = {
  sizeColumns: QuickOrderSizeColumn[];
  productColors?: Array<{ id: string; name: string }>;
  productStockVariants?: Array<{
    colorId: string | null;
    colorName: string | null;
    sizeName: string | null;
  }>;
};

function normalizeColorLookup(value: string): string {
  return value.trim().toLowerCase();
}

function resolveRowColorSnapshot(row: QuickOrderGridRow): string {
  if (row.isCustomColor || !row.colorId) {
    return buildQuickOrderColorDisplaySnapshot({
      colorName: row.colorName,
      colorCode: row.colorCode,
    });
  }
  return row.colorName.trim();
}

function resolveCatalogColorId(colorId: string | null): string | null {
  if (!colorId || colorId.startsWith("name:")) return null;
  return colorId;
}

export function quickOrderRowsToOrderItems(
  rows: QuickOrderGridRow[],
  sizeColumns: QuickOrderSizeColumn[],
): OrderItemInput[] {
  const items: OrderItemInput[] = [];

  rows.forEach((row, index) => {
    const totalQty = sumQuickOrderSizes(row.sizes, sizeColumns);
    if (totalQty < 1) return;

    const colorSnapshot = resolveRowColorSnapshot(row);
    const colorId = resolveCatalogColorId(row.colorId);

    const variants = sizeColumns.flatMap((column, variantIndex) => {
      const quantity = Math.max(0, Math.floor(row.sizes[column.key] || 0));
      if (quantity < 1) return [];
      return [
        {
          colorId,
          colorNameSnapshot: colorSnapshot || null,
          sizeValue: sizeColumnLabelToVariantSizeValue(column),
          quantity,
          unit: row.unit || "cái",
          sortOrder: variantIndex,
        },
      ];
    });

    items.push({
      productId: row.productId,
      productNameSnapshot: row.productName.trim(),
      description: row.description.trim() || null,
      colorId,
      colorSnapshot: colorSnapshot || null,
      supplySource: row.supplySource,
      processingMethod: row.processingMethod,
      revenueCategoryId: row.revenueCategoryId,
      quantity: totalQty,
      unit: row.unit || "cái",
      unitPrice: row.unitPrice,
      sortOrder: index,
      variants,
    });
  });

  return items;
}

function isCatalogColorId(colorId: string | null): boolean {
  return Boolean(colorId && !colorId.startsWith("name:"));
}

export function validateQuickOrderRow(
  row: QuickOrderGridRow,
  context: QuickOrderRowValidationContext,
): Partial<Record<string, string>> {
  const errors: Partial<Record<string, string>> = {};
  const { sizeColumns, productColors = [], productStockVariants = [] } = context;

  if (!row.productName.trim()) {
    errors.productName = "Vui lòng chọn hoặc nhập sản phẩm.";
  }
  if (!row.supplySource) {
    errors.supplySource = "Vui lòng chọn sản phẩm lấy từ cho dòng này.";
  }
  if (!row.processingMethod) {
    errors.processingMethod = "Vui lòng chọn cách xử lý cho dòng này.";
  }
  if (!row.revenueCategoryId) {
    errors.revenueCategoryId = "Vui lòng chọn nhóm doanh thu cho dòng này.";
  }

  const hasColorId = isCatalogColorId(row.colorId);
  const colorName = sanitizeQuickOrderColorName(row.colorName);
  const colorCode = sanitizeQuickOrderColorCode(row.colorCode);

  if (requiresCatalogColor(row.supplySource)) {
    if (!hasColorId) {
      errors.colorName = "Sản phẩm lấy từ Kho ATTD cần chọn màu có trong kho.";
    }
  } else if (!hasColorId) {
    if (!colorName && !colorCode) {
      errors.colorName = "Vui lòng chọn hoặc nhập màu sắc cho dòng này.";
    } else if (!isValidQuickOrderColorName(colorName || row.colorName)) {
      errors.colorName = "Tên màu không hợp lệ.";
    }
  }

  if (sumQuickOrderSizeQuantities(row.sizes, sizeColumns) < 1) {
    errors.quantity = "Dòng sản phẩm phải có số lượng lớn hơn 0.";
  }

  for (const column of sizeColumns) {
    const value = row.sizes[column.key];
    if (value < 0 || !Number.isFinite(value)) {
      errors[`size-${column.key}`] = "Số lượng phải là số lớn hơn hoặc bằng 0.";
    }
  }

  if (row.supplySource === "ATTD_STOCK" && row.productId && hasColorId) {
    const catalogColor = productColors.find((c) => c.id === row.colorId && isCatalogColorId(c.id));
    for (const column of sizeColumns) {
      const qty = Math.max(0, Math.floor(row.sizes[column.key] || 0));
      if (qty < 1) continue;
      const sizeValue = sizeColumnLabelToVariantSizeValue(column);
      const hasStock = productStockVariants.some((variant) => {
        const colorMatch =
          variant.colorId === row.colorId ||
          (catalogColor &&
            normalizeColorLookup(variant.colorName ?? "") ===
              normalizeColorLookup(catalogColor.name));
        const stockSize = (variant.sizeName ?? "").trim();
        const orderSize = sizeValue.trim();
        return (
          colorMatch &&
          (stockSize.toLowerCase() === orderSize.toLowerCase() ||
            (orderSize === "Free size" && stockSize.toLowerCase() === "free"))
        );
      });
      if (!hasStock) {
        errors[`size-${column.key}`] = `Size ${column.label} không có trong kho cho sản phẩm này.`;
      }
    }
  }

  return errors;
}
