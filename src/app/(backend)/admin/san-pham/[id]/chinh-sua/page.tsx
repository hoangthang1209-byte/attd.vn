import { notFound } from "next/navigation";
import Link from "next/link";
import { getProductById } from "@/features/products/services/product.service";
import { getCategories } from "@/features/categories/services/category.service";
import ProductEditForm from "@/components/admin/ProductEditForm";

export default async function ProductEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [product, categories] = await Promise.all([
    getProductById(id),
    getCategories(),
  ]);

  if (!product) notFound();

  return (
    <div style={{ padding: "32px", maxWidth: "640px" }}>
      <Link
        href={`/admin/san-pham/${id}`}
        style={{ fontSize: "14px", color: "#6b7280" }}
      >
        ← Quay lại
      </Link>

      <h1
        style={{
          margin: "20px 0 4px",
          fontSize: "22px",
          fontWeight: 700,
        }}
      >
        Chỉnh sửa sản phẩm
      </h1>
      <div
        style={{
          fontSize: "14px",
          color: "#6b7280",
          marginBottom: "32px",
        }}
      >
        {product.name}
      </div>

      <ProductEditForm product={product} categories={categories} />
    </div>
  );
}
