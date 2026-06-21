import AdminPageTitle from "@/components/admin/AdminPageTitle";
import ProductTiersManager from "@/components/admin/pricing/ProductTiersManager";

export default function ProductTiersPage() {
  return (
    <>
      <AdminPageTitle title={"Bảng giá sản phẩm"} />
      <ProductTiersManager />
    </>
  );
}
