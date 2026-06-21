import AdminPageTitle from "@/components/admin/AdminPageTitle";
import CrmOverviewDashboard from "@/components/admin/crm/CrmOverviewDashboard";

export default function CrmOverviewPage() {
  return (
    <>
      <AdminPageTitle title={"CRM — Tổng quan"} />
      <CrmOverviewDashboard />
    </>
  );
}
