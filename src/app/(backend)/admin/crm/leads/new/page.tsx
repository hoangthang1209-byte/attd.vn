import AdminShell from "@/components/admin/AdminShell";
import CrmLeadForm from "@/components/admin/crm/CrmLeadForm";

export default function CrmLeadNewPage() {
  return (
    <AdminShell title="Thêm lead mới">
      <CrmLeadForm />
    </AdminShell>
  );
}
