import AdminPageTitle from "@/components/admin/AdminPageTitle";
import ProductCatalogDashboard from "@/components/admin/products/ProductCatalogDashboard";

export default function ProductsAdminPage() {
  return (
    <>
      <AdminPageTitle title={"Danh mục sản phẩm B2B"} />
      <ProductCatalogDashboard />
    </>
  );
}
