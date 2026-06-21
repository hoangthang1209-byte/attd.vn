import AdminPageTitle from "@/components/admin/AdminPageTitle";
import CrmLeadsManager from "@/components/admin/CrmLeadsManager";

export default function CrmLeadsPage() {
  return (
    <>
      <AdminPageTitle title={"CRM — Quản lý lead"} />
      <CrmLeadsManager />
    </>
  );
}
