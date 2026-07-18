import AdminPageTitle from "@/components/admin/AdminPageTitle";
import ProductAttributesClient from "@/components/admin/products/ProductAttributesClient";

export default function AdminAttributesPage() {
  return (
    <div className="product-admin-shell product-admin-attributes-page">
      <AdminPageTitle title="Thuộc tính sản phẩm" />
      <ProductAttributesClient />
    </div>
  );
}
