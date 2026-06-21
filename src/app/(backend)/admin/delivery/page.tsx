import AdminPageTitle from "@/components/admin/AdminPageTitle";
import DeliveryBoardManager from "@/components/admin/operations/DeliveryBoardManager";

export default function DeliveryBoardPage() {
  return (
    <>
      <AdminPageTitle title={"Vận hành giao hàng"} />
      <DeliveryBoardManager />
    </>
  );
}
