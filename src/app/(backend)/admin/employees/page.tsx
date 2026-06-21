import AdminPageTitle from "@/components/admin/AdminPageTitle";
import EmployeesList from "@/components/admin/employees/EmployeesList";

export default function AdminEmployeesPage() {
  return (
    <>
      <AdminPageTitle title={"Quản lý nhân viên"} />
      <EmployeesList />
    </>
  );
}
