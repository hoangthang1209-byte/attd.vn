import { ProductionMasterDetailClient } from "@/components/admin/production-master/ProductionMasterClientManagers";

type Props = { params: Promise<{ id: string }> };

export default async function ProductionTrimDetailPage({ params }: Props) {
  const { id } = await params;
  return <ProductionMasterDetailClient kind="trim" itemId={id} />;
}
