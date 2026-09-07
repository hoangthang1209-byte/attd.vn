import AdminPageTitle from "@/components/admin/AdminPageTitle";
import PatternListManager from "@/components/admin/patterns/PatternListManager";
import { adminPageMetadata } from "@/lib/admin/admin-metadata";

export const metadata = adminPageMetadata("Rập");

export default function PatternListPage() {
  return (
    <>
      <AdminPageTitle title="Thư viện rập" />
      <PatternListManager />
    </>
  );
}
