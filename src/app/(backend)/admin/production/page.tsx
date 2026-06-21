import AdminShell from "@/components/admin/AdminShell";
import ProductionBoardManager from "@/components/admin/operations/ProductionBoardManager";

export default function ProductionBoardPage() {
  return (
    <AdminShell title="Sản xuất">
      <ProductionBoardManager />
    </AdminShell>
  );
}
