import { Suspense } from "react";
import AdminPageTitle from "@/components/admin/AdminPageTitle";
import ProductFastCreateWizard from "@/components/admin/products/ProductFastCreateWizard";
import { SectionLoading } from "@/components/ui/loading/ContextLoading";
import { listProductCategories } from "@/features/products/product-admin.service";

export default async function FastCreateProductPage() {
  const categories = await listProductCategories();
  const wizardCategories = categories.map((c) => ({
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
      <AdminPageTitle title="Tạo nhanh sản phẩm" />
      <Suspense
        fallback={
          <SectionLoading
            title="Đang tải trình tạo nhanh..."
            description="Hệ thống đang chuẩn bị quy trình tạo sản phẩm."
            tone="admin"
          />
        }
      >
        <ProductFastCreateWizard categories={wizardCategories} />
      </Suspense>
    </>
  );
}
