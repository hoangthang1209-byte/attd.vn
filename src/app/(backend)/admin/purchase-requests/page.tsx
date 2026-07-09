import { Suspense } from "react";
import AdminPageTitle from "@/components/admin/AdminPageTitle";
import AdminSectionSkeleton from "@/components/admin/feedback/AdminSectionSkeleton";
import PurchaseRequestsList from "@/components/admin/materials/PurchaseRequestsList";

export default function AdminPurchaseRequestsPage() {
  return (
    <>
      <AdminPageTitle title="Yêu cầu mua hàng" />
      <Suspense fallback={<AdminSectionSkeleton message="Đang tải yêu cầu mua hàng…" />}>
        <PurchaseRequestsList />
      </Suspense>
    </>
  );
}
