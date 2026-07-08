import AdminPageTitle from "@/components/admin/AdminPageTitle";
import { ProductionMasterListClient } from "@/components/admin/production-master/ProductionMasterClientManagers";

export default function ProductionSuppliersPage() {
  return (
    <>
      <AdminPageTitle title="Nhà cung cấp sản xuất" />
      <ProductionMasterListClient kind="supplier" />
    </>
  );
}
