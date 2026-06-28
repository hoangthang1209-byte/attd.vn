import ProductionMasterDetailManager from "@/components/admin/production-master/ProductionMasterDetailManager";
import { PRINT_METHOD_ADMIN } from "@/components/admin/production-master/production-master-admin-config";

type Props = { params: Promise<{ id: string }> };

export default async function PrintMethodDetailPage({ params }: Props) {
  const { id } = await params;
  return <ProductionMasterDetailManager config={PRINT_METHOD_ADMIN} itemId={id} />;
}
