import { notFound } from "next/navigation";
import AdminPageTitle from "@/components/admin/AdminPageTitle";
import ProductCatalogForm from "@/components/admin/products/ProductCatalogForm";
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
    variants: product.variants.map((v) => ({
      id: v.id,
      colorName: v.colorName ?? "",
      colorCode: v.colorCode ?? "",
      sizeName: v.sizeName ?? "",
      dimensions: v.dimensions ?? "",
      capacity: v.capacity ?? "",
      wholesalePrice: v.wholesalePrice != null ? String(v.wholesalePrice) : "",
      dealerPrice: v.dealerPrice != null ? String(v.dealerPrice) : "",
      stockQty: String(v.stockQty),
      stockStatus: v.stockStatus,
      imageUrl: v.imageUrl ?? "",
      internalNote: v.internalNote ?? "",
      skuPreview: v.sku,
      skuTaken: false,
    })),
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
