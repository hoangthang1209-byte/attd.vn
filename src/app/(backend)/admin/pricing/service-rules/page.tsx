import AdminPageTitle from "@/components/admin/AdminPageTitle";
import ServiceRulesManager from "@/components/admin/pricing/ServiceRulesManager";

export default function ServiceRulesPage() {
  return (
    <>
      <AdminPageTitle title={"Phí dịch vụ"} />
      <ServiceRulesManager />
    </>
  );
}
