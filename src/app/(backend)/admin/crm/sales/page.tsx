import AdminShell from "@/components/admin/AdminShell";
import SalesRepresentativesList from "@/components/admin/sales/SalesRepresentativesList";

export default function SalesPage() {
  return (
    <AdminShell title="Nhân viên tư vấn">
      <SalesRepresentativesList />
    </AdminShell>
  );
}
