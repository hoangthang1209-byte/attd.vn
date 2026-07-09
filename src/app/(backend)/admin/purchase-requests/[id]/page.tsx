import { Suspense } from "react";
import AdminPageTitle from "@/components/admin/AdminPageTitle";
import AdminSectionSkeleton from "@/components/admin/feedback/AdminSectionSkeleton";
import PurchaseRequestDetail from "@/components/admin/materials/PurchaseRequestDetail";

type Props = { params: Promise<{ id: string }> };

export default async function AdminPurchaseRequestDetailPage({ params }: Props) {
  const { id } = await params;
  return (
    <>
      <AdminPageTitle title="Chi tiết yêu cầu mua hàng" />
      <Suspense fallback={<AdminSectionSkeleton message="Đang tải chi tiết yêu cầu mua…" />}>
        <PurchaseRequestDetail requestId={id} />
      </Suspense>
    </>
  );
}
