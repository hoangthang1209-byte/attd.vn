import AdminPageTitle from "@/components/admin/AdminPageTitle";
import EmployeeForm from "@/components/admin/employees/EmployeeForm";

export default function AdminEmployeeNewPage() {
  return (
    <>
      <AdminPageTitle title={"Thêm nhân viên"} />
      <EmployeeForm mode="create" />
    </>
  );
}
