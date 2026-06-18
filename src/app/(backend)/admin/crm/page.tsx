import AdminShell from "@/components/admin/AdminShell";
import CrmOverviewDashboard from "@/components/admin/crm/CrmOverviewDashboard";

export default function CrmOverviewPage() {
  return (
    <AdminShell title="CRM — Tổng quan">
      <CrmOverviewDashboard />
    </AdminShell>
  );
}
