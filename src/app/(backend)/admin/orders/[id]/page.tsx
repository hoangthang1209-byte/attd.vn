import { Suspense } from "react";
import AdminPageTitle from "@/components/admin/AdminPageTitle";
import OrderDetailView from "@/components/admin/orders/OrderDetailView";
import AdminOrderDetailLoading from "./loading";

type Props = { params: Promise<{ id: string }> };

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params;
  return (
    <>
      <AdminPageTitle title={"Chi tiết đơn hàng"} />
      <Suspense fallback={<AdminOrderDetailLoading />}>
        <OrderDetailView id={id} />
      </Suspense>
    </>
  );
}
