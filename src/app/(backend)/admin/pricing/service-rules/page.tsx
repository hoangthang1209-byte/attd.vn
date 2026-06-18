import AdminShell from "@/components/admin/AdminShell";
import ServiceRulesManager from "@/components/admin/pricing/ServiceRulesManager";

export default function ServiceRulesPage() {
  return (
    <AdminShell title="Phí dịch vụ">
      <ServiceRulesManager />
    </AdminShell>
  );
}
