import AdminShell from "@/components/admin/AdminShell";
import CrmLeadsManager from "@/components/admin/CrmLeadsManager";

export default function CrmAdminPage() {
  return (
    <AdminShell title="CRM — Quản lý lead">
      <CrmLeadsManager />
    </AdminShell>
  );
}
