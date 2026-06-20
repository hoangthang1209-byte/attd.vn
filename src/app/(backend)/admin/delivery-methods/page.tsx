import AdminShell from "@/components/admin/AdminShell";
import DeliveryMethodsList from "@/components/admin/delivery/DeliveryMethodsList";

export default function AdminDeliveryMethodsPage() {
  return (
    <AdminShell title="Quản lý hình thức giao hàng">
      <DeliveryMethodsList />
    </AdminShell>
  );
}
