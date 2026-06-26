import type { OrderItemRecord } from "@/features/orders/order.types";

export function orderItemProductName(item: Pick<OrderItemRecord, "productNameSnapshot" | "variantNameSnapshot">): string {
  return [item.productNameSnapshot, item.variantNameSnapshot].filter(Boolean).join(" · ") || "Sản phẩm";
}

export function formatOrderItemCardHeading(
  item: Pick<OrderItemRecord, "productNameSnapshot" | "variantNameSnapshot" | "colorSnapshot" | "quantity" | "unit">,
): string {
  const name = orderItemProductName(item);
  const color = item.colorSnapshot?.trim() || "—";
  const qty = `${item.quantity} ${item.unit}`;
  return `${name} · ${color} · ${qty}`;
}
