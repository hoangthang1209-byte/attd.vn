import AdminPageTitle from "@/components/admin/AdminPageTitle";
import { ProductionMasterListClient } from "@/components/admin/production-master/ProductionMasterClientManagers";
import { adminPageMetadata } from "@/lib/admin/admin-metadata";

export const metadata = adminPageMetadata("Nhà cung cấp");

export default function ProductionSuppliersPage() {
  return (
    <>
      <AdminPageTitle title="Nhà cung cấp" />
      <ProductionMasterListClient kind="supplier" />
    </>
  );
}
