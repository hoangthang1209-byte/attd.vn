import { Suspense } from "react";
import AdminPageTitle from "@/components/admin/AdminPageTitle";
import ProductCatalogForm from "@/components/admin/products/ProductCatalogForm";

export default function NewProductPage() {
  return (
    <>
      <AdminPageTitle title={"Thêm sản phẩm mới"} />
      <Suspense fallback={<p className="admin-field-hint">Đang tải form sản phẩm…</p>}>
        <ProductCatalogForm />
      </Suspense>
    </>
  );
}
