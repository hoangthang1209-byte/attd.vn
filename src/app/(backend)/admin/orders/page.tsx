import AdminShell from "@/components/admin/AdminShell";
import OrderListManager from "@/components/admin/orders/OrderListManager";

export default function OrdersListPage() {
  return (
    <AdminShell title="Đơn hàng">
      <OrderListManager />
    </AdminShell>
  );
}
