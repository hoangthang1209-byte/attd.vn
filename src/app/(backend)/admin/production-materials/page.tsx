import AdminPageTitle from "@/components/admin/AdminPageTitle";
import { ProductionMasterListClient } from "@/components/admin/production-master/ProductionMasterClientManagers";
import { adminPageMetadata } from "@/lib/admin/admin-metadata";

export const metadata = adminPageMetadata("Nguyên vật liệu");

export default function ProductionMaterialsPage() {
  return (
    <>
      <AdminPageTitle title="Vật liệu sản xuất" />
      <ProductionMasterListClient kind="material" />
    </>
  );
}
