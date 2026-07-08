import { notFound } from "next/navigation";
import { Suspense } from "react";
import AdminPageTitle from "@/components/admin/AdminPageTitle";
import ProductCatalogForm from "@/components/admin/products/ProductCatalogForm";
import ProductSetupChecklist from "@/components/admin/products/ProductSetupChecklist";
import { buildProductAdminEditInitialData } from "@/features/products/product-catalog-form-mappers";
import { getProductAdminById, listProductCategories } from "@/features/products/product-admin.service";
import { buildProductSetupChecklistInputFromProduct } from "@/features/products/product-setup-checklist-adapter";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, categories] = await Promise.all([
    getProductAdminById(id),
    listProductCategories(),
  ]);

  if (!product) notFound();

  const initialData = buildProductAdminEditInitialData(product);
  const checklistInput = buildProductSetupChecklistInputFromProduct(product);

  const cats = categories.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    skuCode: c.skuCode,
  }));

  return (
    <>
      <AdminPageTitle title={`Sửa: ${product.name}`} />
      <Suspense fallback={<p className="admin-field-hint">Đang tải form sản phẩm…</p>}>
        <ProductSetupChecklist input={checklistInput} />
        <ProductCatalogForm initialData={initialData} categories={cats} />
      </Suspense>
    </>
  );
}
