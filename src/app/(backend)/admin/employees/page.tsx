import AdminShell from "@/components/admin/AdminShell";
import EmployeesList from "@/components/admin/employees/EmployeesList";

export default function AdminEmployeesPage() {
  return (
    <AdminShell title="Quản lý nhân viên">
      <EmployeesList />
    </AdminShell>
  );
}
