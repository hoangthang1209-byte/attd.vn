import AdminShell from "@/components/admin/AdminShell";
import ProductCatalogForm from "@/components/admin/products/ProductCatalogForm";

export default function NewProductPage() {
  return (
    <AdminShell title="Thêm sản phẩm mới">
      <ProductCatalogForm />
    </AdminShell>
  );
}
