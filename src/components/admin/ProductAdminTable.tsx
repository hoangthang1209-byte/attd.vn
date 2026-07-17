"use client";

import { useRouter } from "next/navigation";
import { getPrimaryProductImage } from "@/lib/productImages";

type ProductRow = {
  id: string;
  name: string;
  slug: string;
  productCode: string | null;
  status: string;
  updatedAt: string;
  categoryId: string;
  category: { name: string };
  images: { id: string; imageUrl: string; sortOrder: number }[];
};

export default function ProductAdminTable({ products }: { products: ProductRow[] }) {
  const router = useRouter();

  async function setStatus(id: string, status: string) {
    const product = products.find((p) => p.id === id);
    if (!product) return;
    await fetch(`/api/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: product.name,
        slug: product.slug,
        categoryId: product.categoryId,
        status,
      }),
    });
    router.refresh();
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Xóa sản phẩm "${name}"?`)) return;
    await fetch(`/api/products/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Ảnh</th>
            <th>SKU</th>
            <th>Tên</th>
            <th>Danh mục</th>
            <th>Trạng thái</th>
            <th>Cập nhật</th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => {
            const thumb = getPrimaryProductImage(product.images);
            return (
              <tr key={product.id}>
                <td>
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumb} alt="" className="admin-thumb" />
                  ) : (
                    <span className="admin-thumb-placeholder">—</span>
                  )}
                </td>
                <td>{product.productCode ?? "—"}</td>
                <td>{product.name}</td>
                <td>{product.category.name}</td>
                <td>
                  <select
                    value={product.status}
                    onChange={(e) => setStatus(product.id, e.target.value)}
                    className="admin-select-inline"
                  >
                    <option value="ACTIVE">Publish</option>
                    <option value="DRAFT">Draft</option>
                    <option value="ARCHIVED">Hide</option>
                  </select>
                </td>
                <td>{new Date(product.updatedAt).toLocaleDateString("vi-VN")}</td>
                <td className="admin-actions">
                  <a href={`/admin/products/${product.id}/edit`}>Sửa</a>
                  <button type="button" onClick={() => handleDelete(product.id, product.name)}>
                    Xóa
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
