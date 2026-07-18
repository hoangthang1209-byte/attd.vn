import AdminPageTitle from "@/components/admin/AdminPageTitle";
import ProductCatalogDashboard from "@/components/admin/products/ProductCatalogDashboard";

export default function ProductsAdminPage() {
  return (
    <div className="product-admin-shell product-admin-list-page">
      <AdminPageTitle title={"Danh mục sản phẩm B2B"} />
      <ProductCatalogDashboard />
    </div>
  );
}
