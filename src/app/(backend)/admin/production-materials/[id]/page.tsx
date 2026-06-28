import ProductionMasterDetailManager from "@/components/admin/production-master/ProductionMasterDetailManager";
import { PRODUCTION_MATERIAL_ADMIN } from "@/components/admin/production-master/production-master-admin-config";

type Props = { params: Promise<{ id: string }> };

export default async function ProductionMaterialDetailPage({ params }: Props) {
  const { id } = await params;
  return <ProductionMasterDetailManager config={PRODUCTION_MATERIAL_ADMIN} itemId={id} />;
}
