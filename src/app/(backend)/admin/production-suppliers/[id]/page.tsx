import ProductionMasterDetailManager from "@/components/admin/production-master/ProductionMasterDetailManager";
import { PRODUCTION_SUPPLIER_ADMIN } from "@/components/admin/production-master/production-master-admin-config";

type Props = { params: Promise<{ id: string }> };

export default async function ProductionSupplierDetailPage({ params }: Props) {
  const { id } = await params;
  return <ProductionMasterDetailManager config={PRODUCTION_SUPPLIER_ADMIN} itemId={id} />;
}
