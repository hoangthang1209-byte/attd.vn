import AdminShell from "@/components/admin/AdminShell";
import DeliveryMethodForm from "@/components/admin/delivery/DeliveryMethodForm";

export default function AdminDeliveryMethodNewPage() {
  return (
    <AdminShell title="Thêm hình thức giao hàng">
      <DeliveryMethodForm mode="create" />
    </AdminShell>
  );
}
