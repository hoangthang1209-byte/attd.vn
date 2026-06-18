import AdminShell from "@/components/admin/AdminShell";
import CrmCustomerForm from "@/components/admin/crm/CrmCustomerForm";

export default function CrmCustomerNewPage() {
  return (
    <AdminShell title="Thêm khách hàng mới">
      <CrmCustomerForm />
    </AdminShell>
  );
}
