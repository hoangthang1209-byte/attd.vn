import AdminPageTitle from "@/components/admin/AdminPageTitle";
import TechPackListManager from "@/components/admin/tech-pack/TechPackListManager";
import { adminPageMetadata } from "@/lib/admin/admin-metadata";

export const metadata = adminPageMetadata("Tech Pack");

export default function TechPackListPage() {
  return (
    <>
      <AdminPageTitle title="Tech Pack" />
      <TechPackListManager />
    </>
  );
}
