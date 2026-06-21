import AdminPageTitle from "@/components/admin/AdminPageTitle";
import CrmCustomerForm from "@/components/admin/crm/CrmCustomerForm";

export default function CrmCustomerNewPage() {
  return (
    <>
      <AdminPageTitle title={"Thêm khách hàng mới"} />
      <CrmCustomerForm />
    </>
  );
}
