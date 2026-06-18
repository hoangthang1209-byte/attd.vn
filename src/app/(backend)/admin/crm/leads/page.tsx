import AdminShell from "@/components/admin/AdminShell";
import CrmLeadsManager from "@/components/admin/CrmLeadsManager";

export default function CrmLeadsPage() {
  return (
    <AdminShell title="CRM — Quản lý lead">
      <CrmLeadsManager />
    </AdminShell>
  );
}
