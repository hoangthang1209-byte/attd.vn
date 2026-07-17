import { Suspense } from "react";
import AdminPageTitle from "@/components/admin/AdminPageTitle";
import ProductDraftStarter from "@/components/admin/products/ProductDraftStarter";
import { SectionLoading } from "@/components/ui/loading/ContextLoading";
import { listProductCategories } from "@/features/products/product-admin.service";

export default async function NewProductPage() {
  const categories = await listProductCategories();
  const starterCategories = categories.map((c) => ({
    id: c.id,
    name: c.name,
    nameEn: c.nameEn,
    slug: c.slug,
    skuCode: c.skuCode,
    parentId: c.parentId,
    isActive: c.isActive,
  }));

  return (
    <>
      <AdminPageTitle title="Tạo sản phẩm mới" />
      <Suspense
        fallback={
          <SectionLoading
            title="Đang tải form tạo nháp..."
            description="Hệ thống đang chuẩn bị biểu mẫu tạo sản phẩm."
            tone="admin"
          />
        }
      >
        <ProductDraftStarter categories={starterCategories} />
      </Suspense>
    </>
  );
}
