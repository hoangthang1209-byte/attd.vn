import { notFound } from "next/navigation";
import Link from "next/link";
import { getProductById } from "@/features/products/services/product.service";
import ProductImageManager from "@/components/admin/ProductImageManager";

export default async function ProductAdminDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProductById(id);
  if (!product) notFound();

  return (
    <div style={{ padding: "32px", maxWidth: "800px" }}>
      <Link
        href="/quan-tri/san-pham"
        style={{ fontSize: "14px", color: "#6b7280" }}
      >
        ← Quay lại danh sách sản phẩm
      </Link>

      <div style={{ marginTop: "20px", marginBottom: "32px" }}>
        <h1 style={{ margin: "0 0 8px", fontSize: "24px", fontWeight: 700 }}>
          {product.name}
        </h1>
        <div
          style={{
            display: "flex",
            gap: "12px",
            fontSize: "14px",
            color: "#6b7280",
          }}
        >
          {product.productCode && <span>{product.productCode}</span>}
          <span>{product.category.name}</span>
          <span
            style={{
              padding: "2px 8px",
              borderRadius: "4px",
              background:
                product.status === "ACTIVE" ? "#dcfce7" : "#f3f4f6",
              color:
                product.status === "ACTIVE" ? "#16a34a" : "#6b7280",
              fontWeight: 600,
              fontSize: "12px",
            }}
          >
            {product.status === "ACTIVE"
              ? "Đang bán"
              : product.status === "DRAFT"
              ? "Nháp"
              : "Đã ẩn"}
          </span>
        </div>
      </div>

      <hr style={{ border: "none", borderTop: "1px solid #e5e7eb", margin: "0 0 32px" }} />

      <h2 style={{ margin: "0 0 24px", fontSize: "18px", fontWeight: 600 }}>
        Quản lý hình ảnh
      </h2>

      <ProductImageManager productId={id} images={product.images} />
    </div>
  );
}
