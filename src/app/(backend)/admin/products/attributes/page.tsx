import AdminShell from "@/components/admin/AdminShell";
import ProductAttributesClient from "@/components/admin/products/ProductAttributesClient";

export default function ProductAttributesPage() {
  return (
    <AdminShell title="Thuộc tính sản phẩm">
      <ProductAttributesClient />
    </AdminShell>
  );
}
