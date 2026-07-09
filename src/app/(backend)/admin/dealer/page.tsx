import { Suspense } from "react";
import AdminPageTitle from "@/components/admin/AdminPageTitle";
import { AdminLoadingState } from "@/components/admin/AdminUi";
import DealerCompaniesList from "@/components/admin/dealer/DealerCompaniesList";

export default function DealerAdminPage() {
  return (
    <>
      <AdminPageTitle title="Dealer Portal — Đại lý" />
      <Suspense fallback={<AdminLoadingState label="Đang tải danh sách đại lý…" />}>
        <DealerCompaniesList />
      </Suspense>
    </>
  );
}
