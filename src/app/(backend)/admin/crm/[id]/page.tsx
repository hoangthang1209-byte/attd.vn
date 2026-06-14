import { notFound } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import CrmLeadDetail from "@/components/admin/CrmLeadDetail";
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

  return (
    <AdminShell title={`Lead: ${lead.fullName}`}>
      <CrmLeadDetail initialLead={lead} />
    </AdminShell>
  );
}
