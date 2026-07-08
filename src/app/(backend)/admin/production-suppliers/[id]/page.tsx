import { ProductionMasterDetailClient } from "@/components/admin/production-master/ProductionMasterClientManagers";

type Props = { params: Promise<{ id: string }> };

export default async function ProductionSupplierDetailPage({ params }: Props) {
  const { id } = await params;
  return <ProductionMasterDetailClient kind="supplier" itemId={id} />;
}
