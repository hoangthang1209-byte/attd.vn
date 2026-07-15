import AdminPageTitle from "@/components/admin/AdminPageTitle";
import CustomerImportClient from "@/components/admin/crm/import/CustomerImportClient";

export default function CrmCustomerImportPage() {
  return (
    <>
      <AdminPageTitle title="CRM — Import khách hàng" />
      <CustomerImportClient />
    </>
  );
}
