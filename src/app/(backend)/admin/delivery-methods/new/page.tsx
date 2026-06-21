import AdminPageTitle from "@/components/admin/AdminPageTitle";
import DeliveryMethodForm from "@/components/admin/delivery/DeliveryMethodForm";

export default function AdminDeliveryMethodNewPage() {
  return (
    <>
      <AdminPageTitle title={"Thêm hình thức giao hàng"} />
      <DeliveryMethodForm mode="create" />
    </>
  );
}
