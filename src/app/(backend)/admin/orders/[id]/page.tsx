import { Suspense } from "react";
import AdminShell from "@/components/admin/AdminShell";
import OrderDetailView from "@/components/admin/orders/OrderDetailView";
import AdminOrderDetailLoading from "./loading";

type Props = { params: Promise<{ id: string }> };

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params;
  return (
    <AdminShell title="Chi tiết đơn hàng">
      <Suspense fallback={<AdminOrderDetailLoading />}>
        <OrderDetailView id={id} />
      </Suspense>
    </AdminShell>
  );
}
