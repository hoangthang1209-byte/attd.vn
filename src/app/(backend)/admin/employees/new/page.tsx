import AdminShell from "@/components/admin/AdminShell";
import EmployeeForm from "@/components/admin/employees/EmployeeForm";

export default function AdminEmployeeNewPage() {
  return (
    <AdminShell title="Thêm nhân viên">
      <EmployeeForm mode="create" />
    </AdminShell>
  );
}
