export type OrderWorkspaceTab =
  | "products"
  | "info"
  | "delivery"
  | "payment"
  | "activity"
  | "notes";

export const ORDER_WORKSPACE_TABS: Array<{ key: OrderWorkspaceTab; label: string; financialOnly?: boolean }> = [
  { key: "products", label: "Sản phẩm" },
  { key: "info", label: "Thông tin đơn" },
  { key: "delivery", label: "Giao hàng" },
  { key: "payment", label: "Thanh toán", financialOnly: true },
  { key: "activity", label: "Hoạt động" },
  { key: "notes", label: "Ghi chú" },
];

export function orderWorkspaceTabStorageKey(orderId: string) {
  return `order-workspace-tab:${orderId}`;
}

export function orderWorkspaceSectionStorageKey(orderId: string) {
  return `order-workspace-sections:${orderId}`;
}
