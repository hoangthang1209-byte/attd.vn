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
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", marginBottom: "8px" }}>
          <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 700 }}>
            {product.name}
          </h1>
          <Link
            href={`/quan-tri/san-pham/${id}/chinh-sua`}
            style={{
              padding: "8px 16px",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: 600,
              color: "#374151",
              textDecoration: "none",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            Chỉnh sửa
          </Link>
        </div>
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

      {/* SEO Information ─────────────────────────────────────────────────── */}
      <h2 style={{ margin: "0 0 16px", fontSize: "18px", fontWeight: 600 }}>
        Thông tin SEO
      </h2>

      {product.seoTitle || product.seoDescription ? (
        <div
          style={{
            display: "grid",
            gap: "12px",
            marginBottom: "32px",
            padding: "16px",
            border: "1px solid #e5e7eb",
            borderRadius: "10px",
            background: "#fafafa",
          }}
        >
          <div>
            <div style={{ fontSize: "11px", fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>
              SEO Title
            </div>
            <div style={{ fontSize: "14px", color: "#111827" }}>
              {product.seoTitle ?? <span style={{ color: "#9ca3af" }}>—</span>}
            </div>
          </div>
          <div>
            <div style={{ fontSize: "11px", fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>
              SEO Description
            </div>
            <div style={{ fontSize: "14px", color: "#111827" }}>
              {product.seoDescription ?? <span style={{ color: "#9ca3af" }}>—</span>}
            </div>
          </div>
        </div>
      ) : (
        <p style={{ fontSize: "14px", color: "#9ca3af", marginBottom: "32px" }}>
          Chưa cấu hình SEO.{" "}
          <a href={`/quan-tri/san-pham/${id}/chinh-sua`} style={{ color: "#6b7280", textDecoration: "underline" }}>
            Chỉnh sửa
          </a>{" "}
          để thêm.
        </p>
      )}

      <hr style={{ border: "none", borderTop: "1px solid #e5e7eb", margin: "0 0 32px" }} />

      {/* Image Manager ────────────────────────────────────────────────────── */}
      <h2 style={{ margin: "0 0 24px", fontSize: "18px", fontWeight: 600 }}>
        Quản lý hình ảnh
      </h2>

      <ProductImageManager productId={id} images={product.images} />
    </div>
  );
}
