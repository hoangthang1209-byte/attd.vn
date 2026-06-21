import AdminPageTitle from "@/components/admin/AdminPageTitle";
import ProductCatalogForm from "@/components/admin/products/ProductCatalogForm";

export default function NewProductPage() {
  return (
    <>
      <AdminPageTitle title={"Thêm sản phẩm mới"} />
      <ProductCatalogForm />
    </>
  );
}
