import AdminShell from "@/components/admin/AdminShell";
import ProductCatalogDashboard from "@/components/admin/products/ProductCatalogDashboard";

export default function ProductsAdminPage() {
  return (
    <AdminShell title="Danh mục sản phẩm B2B">
      <ProductCatalogDashboard />
    </AdminShell>
  );
}
