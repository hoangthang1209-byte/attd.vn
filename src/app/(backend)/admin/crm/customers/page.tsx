import { Suspense } from "react";
import AdminPageTitle from "@/components/admin/AdminPageTitle";
import CrmCustomersList from "@/components/admin/crm/CrmCustomersList";

export default function CrmCustomersPage() {
  return (
    <>
      <AdminPageTitle title={"CRM — Khách hàng"} />
      <Suspense fallback={<p className="admin-loading">Đang tải...</p>}>
        <CrmCustomersList />
      </Suspense>
    </>
  );
}
