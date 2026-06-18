import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function LegacyCrmLeadRedirectPage({ params }: PageProps) {
  const { id } = await params;
  redirect(`/admin/crm/leads/${id}`);
}
