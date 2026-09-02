import AdminPageTitle from "@/components/admin/AdminPageTitle";
import CostingBatchWorkspace from "@/components/admin/pricing/CostingBatchWorkspace";

type PageProps = { params: Promise<{ id: string }> };

export default async function CostingBatchDetailPage({ params }: PageProps) {
  const { id } = await params;
  return (
    <>
      <AdminPageTitle title="Costing batch workspace" />
      <CostingBatchWorkspace batchId={id} />
    </>
  );
}
