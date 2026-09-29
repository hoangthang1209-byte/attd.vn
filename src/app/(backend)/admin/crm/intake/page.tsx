import AdminPageTitle from "@/components/admin/AdminPageTitle";
import LeadIntakeHealthPanel from "@/components/admin/crm/LeadIntakeHealthPanel";

export default function CrmLeadIntakePage() {
  return (
    <>
      <AdminPageTitle title="CRM — Lead Intake Hub" />
      <LeadIntakeHealthPanel />
    </>
  );
}
