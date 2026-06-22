import { Suspense } from "react";
import AdminPageTitle from "@/components/admin/AdminPageTitle";
import PurchaseRequestsList from "@/components/admin/materials/PurchaseRequestsList";

export default function AdminPurchaseRequestsPage() {
  return (
    <>
      <AdminPageTitle title="Yêu cầu mua hàng" />
      <Suspense fallback={<p className="admin-field-hint">Đang tải…</p>}>
        <PurchaseRequestsList />
      </Suspense>
    </>
  );
}
