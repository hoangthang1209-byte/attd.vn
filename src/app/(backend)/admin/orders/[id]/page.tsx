import AdminShell from "@/components/admin/AdminShell";
import OrderDetailView from "@/components/admin/orders/OrderDetailView";

type Props = { params: Promise<{ id: string }> };

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params;
  return (
    <AdminShell title="Chi tiết đơn hàng">
      <OrderDetailView id={id} />
    </AdminShell>
  );
}
