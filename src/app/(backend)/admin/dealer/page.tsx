import { Suspense } from "react";
import AdminPageTitle from "@/components/admin/AdminPageTitle";
import DealerCompaniesList from "@/components/admin/dealer/DealerCompaniesList";

export default function DealerAdminPage() {
  return (
    <>
      <AdminPageTitle title="Dealer Portal — Đại lý" />
      <Suspense fallback={<p className="admin-loading">Đang tải...</p>}>
        <DealerCompaniesList />
      </Suspense>
    </>
  );
}
