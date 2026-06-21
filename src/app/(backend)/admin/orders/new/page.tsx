import AdminPageTitle from "@/components/admin/AdminPageTitle";
import OrderForm from "@/components/admin/orders/OrderForm";

export default function NewOrderPage() {
  return (
    <>
      <AdminPageTitle title={"Tạo đơn hàng"} />
      <OrderForm mode="create" />
    </>
  );
}
