import AdminShell from "@/components/admin/AdminShell";
import PriceGroupsManager from "@/components/admin/pricing/PriceGroupsManager";

export default function PriceGroupsPage() {
  return (
    <AdminShell title="Nhóm giá">
      <PriceGroupsManager />
    </AdminShell>
  );
}
