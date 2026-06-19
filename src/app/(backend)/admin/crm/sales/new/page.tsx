import AdminShell from "@/components/admin/AdminShell";
import SalesRepresentativeForm from "@/components/admin/sales/SalesRepresentativeForm";

export default function NewSalesRepPage() {
  return (
    <AdminShell title="Thêm nhân viên tư vấn">
      <SalesRepresentativeForm mode="create" />
    </AdminShell>
  );
}
