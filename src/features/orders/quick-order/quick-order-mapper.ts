import type { OrderItemInput } from "@/features/orders/order-totals";
import {
  QUICK_ORDER_SIZE_KEYS,
  sizeKeyToVariantSizeValue,
  sumQuickOrderSizes,
  type QuickOrderGridRow,
} from "@/features/orders/quick-order/quick-order.types";

export function quickOrderRowsToOrderItems(rows: QuickOrderGridRow[]): OrderItemInput[] {
  const items: OrderItemInput[] = [];

  rows.forEach((row, index) => {
    const totalQty = sumQuickOrderSizes(row.sizes);
    if (totalQty < 1) return;

    const variants = QUICK_ORDER_SIZE_KEYS.flatMap((sizeKey, variantIndex) => {
      const quantity = Math.max(0, Math.floor(row.sizes[sizeKey] || 0));
      if (quantity < 1) return [];
      return [
        {
          colorId: row.colorId,
          colorNameSnapshot: row.colorName.trim() || null,
          sizeValue: sizeKeyToVariantSizeValue(sizeKey),
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
      colorId: row.colorId,
      colorSnapshot: row.colorName.trim() || null,
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

export function validateQuickOrderRow(row: QuickOrderGridRow): Partial<Record<string, string>> {
  const errors: Partial<Record<string, string>> = {};
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
  if (sumQuickOrderSizes(row.sizes) < 1) {
    errors.quantity = "Dòng sản phẩm phải có số lượng lớn hơn 0.";
  }
  for (const key of QUICK_ORDER_SIZE_KEYS) {
    const value = row.sizes[key];
    if (value < 0 || !Number.isFinite(value)) {
      errors[`size-${key}`] = "Số lượng phải là số lớn hơn hoặc bằng 0.";
    }
  }
  return errors;
}
