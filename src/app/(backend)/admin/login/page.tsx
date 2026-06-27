import AdminLoginForm from "@/components/admin/AdminLoginForm";
import { listEmployees } from "@/features/employees/employee.service";
import { getAdminAuthStatusMessage } from "@/lib/admin-auth/config";

export default async function AdminLoginPage() {
  const configWarning = getAdminAuthStatusMessage();
  const { employees } = await listEmployees({ activeOnly: true, limit: 200 });
  return <AdminLoginForm configWarning={configWarning} employees={employees} />;
}
