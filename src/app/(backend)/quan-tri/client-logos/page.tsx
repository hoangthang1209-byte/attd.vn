import AdminShell from "@/components/admin/AdminShell";
import ClientLogosManager from "@/components/admin/ClientLogosManager";

export default function ClientLogosPage() {
  return (
    <AdminShell title="Logo khách hàng & đối tác">
      <ClientLogosManager />
    </AdminShell>
  );
}
