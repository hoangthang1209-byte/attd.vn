import AdminPageTitle from "@/components/admin/AdminPageTitle";
import OrderListManager from "@/components/admin/orders/OrderListManager";

export default function OrdersListPage() {
  return (
    <>
      <AdminPageTitle title={"Đơn hàng"} />
      <OrderListManager />
    </>
  );
}
