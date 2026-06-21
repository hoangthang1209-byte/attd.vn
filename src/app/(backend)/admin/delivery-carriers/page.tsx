import AdminPageTitle from "@/components/admin/AdminPageTitle";
import DeliveryCarriersList from "@/components/admin/delivery/DeliveryCarriersList";

export default function AdminDeliveryCarriersPage() {
  return (
    <>
      <AdminPageTitle title="Quản lý đơn vị vận chuyển" />
      <DeliveryCarriersList />
    </>
  );
}
