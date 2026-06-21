import AdminPageTitle from "@/components/admin/AdminPageTitle";
import ProductionBoardManager from "@/components/admin/operations/ProductionBoardManager";

export default function ProductionBoardPage() {
  return (
    <>
      <AdminPageTitle title={"Sản xuất"} />
      <ProductionBoardManager />
    </>
  );
}
