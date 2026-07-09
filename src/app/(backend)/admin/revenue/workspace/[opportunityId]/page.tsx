import AdminPageTitle from "@/components/admin/AdminPageTitle";
import RevenueWorkspace from "@/components/admin/revenue/RevenueWorkspace";

type Props = {
  params: Promise<{ opportunityId: string }>;
};

export default async function RevenueWorkspacePage({ params }: Props) {
  const { opportunityId } = await params;

  return (
    <>
      <AdminPageTitle title="Revenue Workspace" />
      <RevenueWorkspace opportunityId={opportunityId} />
    </>
  );
}
