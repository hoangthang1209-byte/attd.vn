import AdminPageTitle from "@/components/admin/AdminPageTitle";
import ProductionMasterListManager from "@/components/admin/production-master/ProductionMasterListManager";
import { PRODUCTION_SUPPLIER_ADMIN } from "@/components/admin/production-master/production-master-admin-config";

export default function ProductionSuppliersPage() {
  return (
    <>
      <AdminPageTitle title="Nhà cung cấp sản xuất" />
      <ProductionMasterListManager config={PRODUCTION_SUPPLIER_ADMIN} />
    </>
  );
}
