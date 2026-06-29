import AdminPageTitle from "@/components/admin/AdminPageTitle";
import DealerCompanyForm from "@/components/admin/dealer/DealerCompanyForm";

export default function NewDealerCompanyPage() {
  return (
    <>
      <AdminPageTitle title="Thêm đại lý mới" />
      <DealerCompanyForm mode="create" />
    </>
  );
}
