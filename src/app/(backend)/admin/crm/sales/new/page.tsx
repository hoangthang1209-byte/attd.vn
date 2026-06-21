import AdminPageTitle from "@/components/admin/AdminPageTitle";
import SalesRepresentativeForm from "@/components/admin/sales/SalesRepresentativeForm";

export default function NewSalesRepPage() {
  return (
    <>
      <AdminPageTitle title={"Thêm nhân viên tư vấn"} />
      <SalesRepresentativeForm mode="create" />
    </>
  );
}
