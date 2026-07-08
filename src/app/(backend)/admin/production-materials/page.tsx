import AdminPageTitle from "@/components/admin/AdminPageTitle";
import { ProductionMasterListClient } from "@/components/admin/production-master/ProductionMasterClientManagers";

export default function ProductionMaterialsPage() {
  return (
    <>
      <AdminPageTitle title="Vật liệu sản xuất" />
      <ProductionMasterListClient kind="material" />
    </>
  );
}
