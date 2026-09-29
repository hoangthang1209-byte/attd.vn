import AdminPageTitle from "@/components/admin/AdminPageTitle";
import LeadImportClient from "@/components/admin/crm/import/LeadImportClient";

export default function CrmLeadImportPage() {
  return (
    <>
      <AdminPageTitle title="CRM — Import lead CSV" />
      <LeadImportClient />
    </>
  );
}
