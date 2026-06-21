import AdminPageTitle from "@/components/admin/AdminPageTitle";
import DeliveryMethodsList from "@/components/admin/delivery/DeliveryMethodsList";

export default function AdminDeliveryMethodsPage() {
  return (
    <>
      <AdminPageTitle title={"Quản lý hình thức giao hàng"} />
      <DeliveryMethodsList />
    </>
  );
}
