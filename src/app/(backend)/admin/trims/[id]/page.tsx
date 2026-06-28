import ProductionMasterDetailManager from "@/components/admin/production-master/ProductionMasterDetailManager";
import { PRODUCTION_TRIM_ADMIN } from "@/components/admin/production-master/production-master-admin-config";

type Props = { params: Promise<{ id: string }> };

export default async function ProductionTrimDetailPage({ params }: Props) {
  const { id } = await params;
  return <ProductionMasterDetailManager config={PRODUCTION_TRIM_ADMIN} itemId={id} />;
}
