import { Suspense } from "react";
import AdminPageTitle from "@/components/admin/AdminPageTitle";
import PurchaseRequestNewForm from "@/components/admin/materials/PurchaseRequestNewForm";

export default function AdminPurchaseRequestNewPage() {
  return (
    <>
      <AdminPageTitle title="Tạo yêu cầu mua hàng" />
      <Suspense fallback={<p className="admin-field-hint">Đang tải…</p>}>
        <PurchaseRequestNewForm />
      </Suspense>
    </>
  );
}
