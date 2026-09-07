import OrderListManager from "@/components/admin/orders/OrderListManager";
import { adminPageMetadata } from "@/lib/admin/admin-metadata";

export const metadata = adminPageMetadata("Đơn hàng");

export default function OrdersListPage() {
  return <OrderListManager />;
}
