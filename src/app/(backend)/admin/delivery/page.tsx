import AdminShell from "@/components/admin/AdminShell";
import DeliveryBoardManager from "@/components/admin/operations/DeliveryBoardManager";

export default function DeliveryBoardPage() {
  return (
    <AdminShell title="Vận hành giao hàng">
      <DeliveryBoardManager />
    </AdminShell>
  );
}
