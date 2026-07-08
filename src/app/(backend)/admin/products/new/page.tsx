import Link from "next/link";
import { Suspense } from "react";
import AdminPageTitle from "@/components/admin/AdminPageTitle";
import ProductCatalogForm from "@/components/admin/products/ProductCatalogForm";
import { FAST_CREATE_ROUTES } from "@/features/products/product-fast-create";

export default function NewProductPage() {
  return (
    <>
      <AdminPageTitle title="Tạo nâng cao" />
      <p className="admin-field-hint">
        Cần tạo nhanh? Dùng{" "}
        <Link href={FAST_CREATE_ROUTES.fast} className="admin-link">
          Tạo nhanh sản phẩm
        </Link>
        .
      </p>
      <Suspense fallback={<p className="admin-field-hint">Đang tải form sản phẩm…</p>}>
        <ProductCatalogForm />
      </Suspense>
    </>
  );
}
