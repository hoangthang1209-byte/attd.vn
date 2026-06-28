import AdminPageTitle from "@/components/admin/AdminPageTitle";
import ProductionMasterListManager from "@/components/admin/production-master/ProductionMasterListManager";
import { PRINT_METHOD_ADMIN } from "@/components/admin/production-master/production-master-admin-config";

export default function PrintMethodsPage() {
  return (
    <>
      <AdminPageTitle title="Công nghệ in / thêu" />
      <ProductionMasterListManager config={PRINT_METHOD_ADMIN} />
    </>
  );
}
