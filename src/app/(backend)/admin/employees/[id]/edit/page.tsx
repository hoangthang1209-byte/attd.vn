import AdminPageTitle from "@/components/admin/AdminPageTitle";
import EmployeeForm from "@/components/admin/employees/EmployeeForm";

type Props = { params: Promise<{ id: string }> };

export default async function AdminEmployeeEditPage({ params }: Props) {
  const { id } = await params;
  return (
    <>
      <AdminPageTitle title={"Sửa nhân viên"} />
      <EmployeeForm mode="edit" employeeId={id} />
    </>
  );
}
