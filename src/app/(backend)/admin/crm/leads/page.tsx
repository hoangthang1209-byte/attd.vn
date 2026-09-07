import AdminPageTitle from "@/components/admin/AdminPageTitle";
import CrmLeadsManager from "@/components/admin/CrmLeadsManager";
import { adminPageMetadata } from "@/lib/admin/admin-metadata";

export const metadata = adminPageMetadata("Lead");

export default function CrmLeadsPage() {
  return (
    <>
      <AdminPageTitle title={"CRM — Quản lý lead"} />
      <CrmLeadsManager />
    </>
  );
}
