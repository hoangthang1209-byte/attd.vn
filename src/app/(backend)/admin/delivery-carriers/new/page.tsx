import AdminPageTitle from "@/components/admin/AdminPageTitle";
import DeliveryCarrierForm from "@/components/admin/delivery/DeliveryCarrierForm";

export default function AdminDeliveryCarrierNewPage() {
  return (
    <>
      <AdminPageTitle title="Thêm đơn vị vận chuyển" />
      <DeliveryCarrierForm mode="create" />
    </>
  );
}
