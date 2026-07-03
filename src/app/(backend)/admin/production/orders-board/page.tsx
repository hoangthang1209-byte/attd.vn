import AdminPageTitle from "@/components/admin/AdminPageTitle";
import ProductionBoardManager from "@/components/admin/operations/ProductionBoardManager";

export default function ProductionOrdersBoardPage() {
  return (
    <>
      <AdminPageTitle title="Bảng sản xuất theo đơn" />
      <ProductionBoardManager />
    </>
  );
}
