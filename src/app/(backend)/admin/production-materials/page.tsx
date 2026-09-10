import AdminPageTitle from "@/components/admin/AdminPageTitle";
import MaterialLibraryListManager from "@/components/admin/production-master/MaterialLibraryListManager";
import { adminPageMetadata } from "@/lib/admin/admin-metadata";

export const metadata = adminPageMetadata("Thư viện nguyên phụ liệu");

export default function ProductionMaterialsPage() {
  return (
    <>
      <AdminPageTitle title="Thư viện nguyên phụ liệu" />
      <MaterialLibraryListManager />
    </>
  );
}
