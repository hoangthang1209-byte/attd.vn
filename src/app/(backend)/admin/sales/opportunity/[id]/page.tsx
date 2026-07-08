import AdminPageTitle from "@/components/admin/AdminPageTitle";
import SalesOpportunityWorkspace from "@/components/admin/sales/SalesOpportunityWorkspace";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function SalesOpportunityWorkspacePage({ params }: Props) {
  const { id } = await params;

  return (
    <>
      <AdminPageTitle title="Không gian cơ hội bán hàng" />
      <SalesOpportunityWorkspace opportunityId={id} />
    </>
  );
}
