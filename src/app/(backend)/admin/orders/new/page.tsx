import AdminShell from "@/components/admin/AdminShell";
import OrderForm from "@/components/admin/orders/OrderForm";

export default function NewOrderPage() {
  return (
    <AdminShell title="Tạo đơn hàng">
      <OrderForm mode="create" />
    </AdminShell>
  );
}
