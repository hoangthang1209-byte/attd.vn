import AdminPageTitle from "@/components/admin/AdminPageTitle";
import { ProductionMasterListClient } from "@/components/admin/production-master/ProductionMasterClientManagers";

export default function PrintMethodsPage() {
  return (
    <>
      <AdminPageTitle title="Công nghệ in / thêu" />
      <ProductionMasterListClient kind="print-method" />
    </>
  );
}
