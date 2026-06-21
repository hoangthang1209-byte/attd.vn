import AdminShell from "@/components/admin/AdminShell";
import OperationsDashboard from "@/components/admin/operations/OperationsDashboard";

export default function OperationsPage() {
  return (
    <AdminShell title="Tổng quan vận hành">
      <OperationsDashboard />
    </AdminShell>
  );
}
