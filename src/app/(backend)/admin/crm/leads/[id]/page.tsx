import { notFound } from "next/navigation";
import AdminPageTitle from "@/components/admin/AdminPageTitle";
import CrmLeadDetailView from "@/components/admin/crm/CrmLeadDetailView";
import { displayLeadCompanyName, displayLeadContactName } from "@/features/crm/labels";
import { getCrmLeadById } from "@/features/crm/services/crm-lead.service";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function CrmLeadDetailPage({ params }: PageProps) {
  const { id } = await params;
  const lead = await getCrmLeadById(id);

  if (!lead) {
    notFound();
  }

  const title =
    lead.code ||
    displayLeadCompanyName(lead) ||
    displayLeadContactName(lead) ||
    "Chi tiết lead";

  return (
    <>
      <AdminPageTitle title={`Lead: ${title}`} />
      <CrmLeadDetailView initialLead={lead} />
    </>
  );
}
