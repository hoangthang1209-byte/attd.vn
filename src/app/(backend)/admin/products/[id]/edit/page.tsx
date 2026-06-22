import { notFound } from "next/navigation";
import AdminPageTitle from "@/components/admin/AdminPageTitle";
import ProductCatalogForm from "@/components/admin/products/ProductCatalogForm";
import {
  mapOptionsToFormRows,
  mapVariantsToFormRows,
} from "@/components/admin/products/ProductCatalogVariantsSection";
import { getProductAdminById, listProductCategories } from "@/features/products/product-admin.service";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, categories] = await Promise.all([
    getProductAdminById(id),
    listProductCategories(),
  ]);

  if (!product) notFound();

  const initialData = {
    id: product.id,
    slug: product.slug ?? undefined,
    name: product.name,
    productCode: product.productCode ?? "",
    categoryId: product.categoryId,
    shortDescription: product.shortDescription ?? "",
    description: product.description ?? "",
    material: product.material ?? "",
    form: product.form ?? "",
    fit: product.fit ?? "",
    defaultMoq: product.defaultMoq ? String(product.defaultMoq) : "",
    leadTime: product.leadTime ?? "",
    useCases: (product.useCases as string[]).join(", "),
    targetCustomers: (product.targetCustomers as string[]).join(", "),
    supportsPrinting: product.supportsPrinting,
    supportsEmbroidery: product.supportsEmbroidery,
    supportsOem: product.supportsOem,
    tags: (product.tags as string[]).join(", "),
    status: product.status,
    featuredImage: product.featuredImage ?? "",
    gallery: (product.gallery as string[]) ?? [],
    specifications: product.specifications.map((row) => ({
      id: row.id,
      label: row.label,
      value: row.value,
      sortOrder: row.sortOrder,
    })),
    customizations: product.customizationCapabilities.map((row) => ({
      id: row.id,
      label: row.label,
      description: row.description ?? "",
      sortOrder: row.sortOrder,
      enabled: row.enabled,
    })),
    options: mapOptionsToFormRows(product.options),
    variants: mapVariantsToFormRows(product.variants),
    seoTitle: product.seoTitle ?? "",
    seoDescription: product.seoDescription ?? "",
  };

  const cats = categories.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    skuCode: c.skuCode,
  }));

  return (
    <>
      <AdminPageTitle title={`Sửa: ${product.name}`} />
      <ProductCatalogForm initialData={initialData} categories={cats} />
    </>
  );
}
