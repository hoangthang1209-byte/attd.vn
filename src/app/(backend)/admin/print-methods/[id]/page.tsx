import { ProductionMasterDetailClient } from "@/components/admin/production-master/ProductionMasterClientManagers";

type Props = { params: Promise<{ id: string }> };

export default async function PrintMethodDetailPage({ params }: Props) {
  const { id } = await params;
  return <ProductionMasterDetailClient kind="print-method" itemId={id} />;
}
