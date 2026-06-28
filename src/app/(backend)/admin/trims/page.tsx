import AdminPageTitle from "@/components/admin/AdminPageTitle";
import ProductionMasterListManager from "@/components/admin/production-master/ProductionMasterListManager";
import { PRODUCTION_TRIM_ADMIN } from "@/components/admin/production-master/production-master-admin-config";

export default function ProductionTrimsPage() {
  return (
    <>
      <AdminPageTitle title="Phụ liệu sản xuất" />
      <ProductionMasterListManager config={PRODUCTION_TRIM_ADMIN} />
    </>
  );
}
