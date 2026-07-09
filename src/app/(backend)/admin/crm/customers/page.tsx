import { Suspense } from "react";
import AdminPageTitle from "@/components/admin/AdminPageTitle";
import CrmCustomersList from "@/components/admin/crm/CrmCustomersList";
import { SectionLoading } from "@/components/ui/loading/ContextLoading";

export default function CrmCustomersPage() {
  return (
    <>
      <AdminPageTitle title={"CRM — Khách hàng"} />
      <Suspense
        fallback={
          <SectionLoading
            title="Đang tải danh sách khách hàng..."
            description="Hệ thống đang chuẩn bị bộ lọc và dữ liệu khách hàng."
            tone="admin"
          />
        }
      >
        <CrmCustomersList />
      </Suspense>
    </>
  );
}
