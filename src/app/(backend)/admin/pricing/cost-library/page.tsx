import AdminPageTitle from "@/components/admin/AdminPageTitle";
import CostLibraryManager from "@/components/admin/pricing/CostLibraryManager";
import { adminPageMetadata } from "@/lib/admin/admin-metadata";

export const metadata = adminPageMetadata("Thư viện chi phí");

export default function CostLibraryPage() {
  return (
    <>
      <AdminPageTitle title={"Thư viện chi phí"} />
      <CostLibraryManager />
    </>
  );
}
