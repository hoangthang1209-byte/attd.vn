import AdminPageTitle from "@/components/admin/AdminPageTitle";
import ProductionMasterListManager from "@/components/admin/production-master/ProductionMasterListManager";
import { PRODUCTION_MATERIAL_ADMIN } from "@/components/admin/production-master/production-master-admin-config";

export default function ProductionMaterialsPage() {
  return (
    <>
      <AdminPageTitle title="Vật liệu sản xuất" />
      <ProductionMasterListManager config={PRODUCTION_MATERIAL_ADMIN} />
    </>
  );
}
