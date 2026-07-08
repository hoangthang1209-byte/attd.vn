import { Suspense } from "react";
import AdminPageTitle from "@/components/admin/AdminPageTitle";
import ProductFastCreateWizard from "@/components/admin/products/ProductFastCreateWizard";
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
      <Suspense fallback={<p className="admin-field-hint">Đang tải…</p>}>
        <ProductFastCreateWizard categories={wizardCategories} />
      </Suspense>
    </>
  );
}
