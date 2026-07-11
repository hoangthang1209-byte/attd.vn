import AdminPageTitle from "@/components/admin/AdminPageTitle";
import CustomerTypeManager from "@/components/admin/crm/CustomerTypeManager";

export default function CustomerTypesPage() {
  return (
    <>
      <AdminPageTitle title="Loại khách hàng" />
      <CustomerTypeManager />
    </>
  );
}
