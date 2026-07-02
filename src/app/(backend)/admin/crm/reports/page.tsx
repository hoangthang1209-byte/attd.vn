import { Suspense } from "react";
import AdminPageTitle from "@/components/admin/AdminPageTitle";
import CrmReportsWorkspace from "@/components/admin/crm/CrmReportsWorkspace";

export default function CrmReportsPage() {
  return (
    <>
      <AdminPageTitle title={"CRM — Báo cáo"} />
      <Suspense fallback={<p className="admin-loading">Đang tải...</p>}>
        <CrmReportsWorkspace />
      </Suspense>
    </>
  );
}
