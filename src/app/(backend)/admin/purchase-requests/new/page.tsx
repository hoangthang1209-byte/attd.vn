import { Suspense } from "react";
import AdminPageTitle from "@/components/admin/AdminPageTitle";
import AdminSectionSkeleton from "@/components/admin/feedback/AdminSectionSkeleton";
import PurchaseRequestNewForm from "@/components/admin/materials/PurchaseRequestNewForm";

export default function AdminPurchaseRequestNewPage() {
  return (
    <>
      <AdminPageTitle title="Tạo yêu cầu mua hàng" />
      <Suspense fallback={<AdminSectionSkeleton message="Đang chuẩn bị form yêu cầu mua…" />}>
        <PurchaseRequestNewForm />
      </Suspense>
    </>
  );
}
