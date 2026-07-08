import { ProductionMasterDetailClient } from "@/components/admin/production-master/ProductionMasterClientManagers";

type Props = { params: Promise<{ id: string }> };

export default async function ProductionMaterialDetailPage({ params }: Props) {
  const { id } = await params;
  return <ProductionMasterDetailClient kind="material" itemId={id} />;
}
