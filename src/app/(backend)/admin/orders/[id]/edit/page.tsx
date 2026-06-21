import AdminPageTitle from "@/components/admin/AdminPageTitle";
import OrderForm from "@/components/admin/orders/OrderForm";

type Props = { params: Promise<{ id: string }> };

export default async function EditOrderPage({ params }: Props) {
  const { id } = await params;
  return (
    <>
      <AdminPageTitle title={"Chỉnh sửa đơn hàng"} />
      <OrderForm mode="edit" orderId={id} />
    </>
  );
}
