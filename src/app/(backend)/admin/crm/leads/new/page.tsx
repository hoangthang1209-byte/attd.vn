import AdminPageTitle from "@/components/admin/AdminPageTitle";
import CrmLeadForm from "@/components/admin/crm/CrmLeadForm";

export default function CrmLeadNewPage() {
  return (
    <>
      <AdminPageTitle title={"Thêm lead mới"} />
      <CrmLeadForm />
    </>
  );
}
