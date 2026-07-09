import Link from "next/link";
import { Suspense } from "react";
import AdminPageTitle from "@/components/admin/AdminPageTitle";
import ProductCatalogForm from "@/components/admin/products/ProductCatalogForm";
import { SectionLoading } from "@/components/ui/loading/ContextLoading";
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
      <Suspense
        fallback={
          <SectionLoading
            title="Đang tải form sản phẩm..."
            description="Hệ thống đang chuẩn bị biểu mẫu và dữ liệu catalog."
            tone="admin"
          />
        }
      >
        <ProductCatalogForm />
      </Suspense>
    </>
  );
}
