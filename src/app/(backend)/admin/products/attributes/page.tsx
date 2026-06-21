import AdminPageTitle from "@/components/admin/AdminPageTitle";
import ProductAttributesClient from "@/components/admin/products/ProductAttributesClient";

export default function ProductAttributesPage() {
  return (
    <>
      <AdminPageTitle title={"Thuộc tính sản phẩm"} />
      <ProductAttributesClient />
    </>
  );
}
