import AdminPageTitle from "@/components/admin/AdminPageTitle";
import { ProductionMasterListClient } from "@/components/admin/production-master/ProductionMasterClientManagers";

export default function ProductionTrimsPage() {
  return (
    <>
      <AdminPageTitle title="Phụ liệu sản xuất" />
      <ProductionMasterListClient kind="trim" />
    </>
  );
}
