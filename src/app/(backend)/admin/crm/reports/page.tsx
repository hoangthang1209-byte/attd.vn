import { Suspense } from "react";
import AdminPageTitle from "@/components/admin/AdminPageTitle";
import CrmReportsWorkspace from "@/components/admin/crm/CrmReportsWorkspace";
import { SectionLoading } from "@/components/ui/loading/ContextLoading";

export default function CrmReportsPage() {
  return (
    <>
      <AdminPageTitle title={"CRM — Báo cáo"} />
      <Suspense
        fallback={
          <SectionLoading
            title="Đang tải báo cáo CRM..."
            description="Hệ thống đang chuẩn bị dữ liệu báo cáo và bộ lọc."
            tone="admin"
          />
        }
      >
        <CrmReportsWorkspace />
      </Suspense>
    </>
  );
}
