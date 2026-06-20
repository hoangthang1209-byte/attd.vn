import AdminShell from "@/components/admin/AdminShell";
import OrderForm from "@/components/admin/orders/OrderForm";

type Props = { params: Promise<{ id: string }> };

export default async function EditOrderPage({ params }: Props) {
  const { id } = await params;
  return (
    <AdminShell title="Chỉnh sửa đơn hàng">
      <OrderForm mode="edit" orderId={id} />
    </AdminShell>
  );
}
