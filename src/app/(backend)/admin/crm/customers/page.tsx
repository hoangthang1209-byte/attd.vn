import { Suspense } from "react";
import AdminShell from "@/components/admin/AdminShell";
import CrmCustomersList from "@/components/admin/crm/CrmCustomersList";

export default function CrmCustomersPage() {
  return (
    <AdminShell title="CRM — Khách hàng">
      <Suspense fallback={<p className="admin-loading">Đang tải...</p>}>
        <CrmCustomersList />
      </Suspense>
    </AdminShell>
  );
}
