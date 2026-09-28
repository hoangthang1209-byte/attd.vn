import { notFound, redirect } from "next/navigation";
import AdminPageTitle from "@/components/admin/AdminPageTitle";
import CrmLeadDetailView from "@/components/admin/crm/CrmLeadDetailView";
import { displayLeadCompanyName, displayLeadContactName } from "@/features/crm/labels";
import { getCrmLeadById } from "@/features/crm/services/crm-lead.service";
import { getAdminSessionFromCookies } from "@/lib/admin-auth/get-admin-session";
import { can } from "@/features/auth/admin-permissions";
import { canAccessLeadRecord } from "@/features/auth/lead-scope";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function CrmLeadDetailPage({ params }: PageProps) {
  const { id } = await params;
  const session = await getAdminSessionFromCookies();
  if (!can(session, "leads.view")) {
    redirect("/admin/crm/leads?forbidden=1");
  }

  const lead = await getCrmLeadById(id);

  if (!lead) {
    notFound();
  }

  if (!canAccessLeadRecord(session, lead, "leads.view")) {
    redirect("/admin/crm/leads?forbidden=1");
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
