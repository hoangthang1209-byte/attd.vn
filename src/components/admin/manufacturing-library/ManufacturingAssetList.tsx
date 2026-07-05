"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type {
  MlAsset,
  MlCategory,
  MlDisplayLocation,
} from "@/components/admin/manufacturing-library/ManufacturingLibraryAdminTypes";

type Props = {
  assets: MlAsset[];
  total: number;
  page: number;
  pageSize: number;
  filters: Record<string, string>;
  categories: MlCategory[];
  displayLocations: MlDisplayLocation[];
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Bản nháp",
  PUBLISHED: "Đã xuất bản",
  ARCHIVED: "Lưu trữ",
};

const VISIBILITY_LABEL: Record<string, string> = {
  PUBLIC: "Public",
  DEALER_ONLY: "Đại lý",
  CUSTOMER_ONLY: "Khách hàng",
  INTERNAL: "Nội bộ",
};

const SORT_LABEL: Record<string, string> = {
  "updated-desc": "Cập nhật mới nhất",
  "published-desc": "Xuất bản mới nhất",
  "priority-asc": "Ưu tiên tăng dần",
  "priority-desc": "Ưu tiên giảm dần",
  "title-asc": "Tiêu đề A-Z",
};

function formatDate(value: string | Date) {
  return new Date(value).toLocaleString("vi-VN");
}

function badgeClass(value: string) {
  if (value === "PUBLISHED" || value === "PUBLIC") return "admin-badge admin-badge--success";
  if (value === "DRAFT" || value === "INTERNAL") return "admin-badge admin-badge--muted";
  if (value === "ARCHIVED") return "admin-badge admin-badge--warning";
  return "admin-badge admin-badge--info";
}

export default function ManufacturingAssetList({
  assets,
  total,
  page,
  pageSize,
  filters,
  categories,
  displayLocations,
}: Props) {
  const router = useRouter();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  async function archiveAsset(id: string) {
    if (!confirm("Lưu trữ tài sản sản xuất này?")) return;
    const res = await fetch(`/api/admin/manufacturing-library/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.message ?? "Không thể lưu trữ");
      return;
    }
    router.refresh();
  }

  function pageHref(nextPage: number) {
    const params = new URLSearchParams(filters);
    params.set("page", String(nextPage));
    return `/admin/manufacturing-library?${params.toString()}`;
  }

  return (
    <div className="admin-panel">
      <div className="admin-panel-header">
        <div>
          <h2>Thư viện sản xuất</h2>
          <p className="admin-field-hint">Quản lý tài sản, media, vị trí hiển thị và workflow.</p>
        </div>
        <div className="admin-panel-actions">
          <Link className="btn-primary" href="/admin/manufacturing-library/new">
            Tạo tài sản sản xuất
          </Link>
        </div>
      </div>

      <form className="admin-form admin-form--compact" action="/admin/manufacturing-library">
        <div className="admin-form-grid">
          <input
            className="admin-input"
            name="search"
            placeholder="Tìm title, slug, mô tả"
            defaultValue={filters.search ?? ""}
          />
          <select className="admin-input" name="categoryId" defaultValue={filters.categoryId ?? ""}>
            <option value="">Tất cả danh mục</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <select className="admin-input" name="status" defaultValue={filters.status ?? ""}>
            <option value="">Tất cả trạng thái</option>
            <option value="DRAFT">Bản nháp</option>
            <option value="PUBLISHED">Đã xuất bản</option>
            <option value="ARCHIVED">Lưu trữ</option>
          </select>
          <select className="admin-input" name="visibility" defaultValue={filters.visibility ?? ""}>
            <option value="">Tất cả phạm vi</option>
            <option value="PUBLIC">Public</option>
            <option value="DEALER_ONLY">Đại lý</option>
            <option value="CUSTOMER_ONLY">Khách hàng</option>
            <option value="INTERNAL">Nội bộ</option>
          </select>
          <select className="admin-input" name="featured" defaultValue={filters.featured ?? ""}>
            <option value="">Tất cả nổi bật</option>
            <option value="true">Nổi bật</option>
            <option value="false">Không nổi bật</option>
          </select>
          <select
            className="admin-input"
            name="displayLocationId"
            defaultValue={filters.displayLocationId ?? ""}
          >
            <option value="">Tất cả vị trí</option>
            {displayLocations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
          <select className="admin-input" name="sort" defaultValue={filters.sort ?? "updated-desc"}>
            {Object.entries(SORT_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="admin-form-actions">
          <button type="submit" className="btn-secondary">
            Lọc
          </button>
          <Link href="/admin/manufacturing-library" className="admin-link-button">
            Xóa lọc
          </Link>
        </div>
      </form>

      {assets.length === 0 ? (
        <div className="admin-empty-state">
          <p>Chưa có tài sản sản xuất phù hợp.</p>
          <p className="admin-field-hint">
            Thư viện sản xuất sẽ không hiển thị ngoài public cho đến khi có tài sản đã xuất bản
            được gắn MediaAsset hợp lệ.
          </p>
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Tiêu đề</th>
                <th>Danh mục</th>
                <th>Trạng thái</th>
                <th>Phạm vi</th>
                <th>Nổi bật</th>
                <th>Vị trí hiển thị</th>
                <th>Media</th>
                <th>Ưu tiên</th>
                <th>Cập nhật</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((asset) => (
                <tr key={asset.id}>
                  <td>
                    <strong>{asset.title}</strong>
                    <br />
                    <code>{asset.slug}</code>
                  </td>
                  <td>{asset.category?.name ?? "Chưa chọn"}</td>
                  <td>
                    <span className={badgeClass(asset.status)}>
                      {STATUS_LABEL[asset.status] ?? asset.status}
                    </span>
                  </td>
                  <td>
                    <span className={badgeClass(asset.visibility)}>
                      {VISIBILITY_LABEL[asset.visibility] ?? asset.visibility}
                    </span>
                  </td>
                  <td>
                    {asset.featured ? (
                      <span className="admin-badge admin-badge--info">Nổi bật</span>
                    ) : (
                      <span className="admin-badge admin-badge--muted">Không</span>
                    )}
                  </td>
                  <td>
                    {asset.displayLocations
                      .map((item) => item.displayLocation.name)
                      .join(", ") || "Chưa gắn"}
                  </td>
                  <td>{asset.media.length}</td>
                  <td>{asset.priority}</td>
                  <td>{formatDate(asset.updatedAt)}</td>
                  <td>
                    <div className="admin-table-actions">
                      <Link href={`/admin/manufacturing-library/${asset.id}`}>Sửa</Link>
                      {asset.status !== "ARCHIVED" ? (
                        <button type="button" onClick={() => archiveAsset(asset.id)}>
                          Lưu trữ
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="admin-table-actions" style={{ marginTop: 16 }}>
        <span>
          Trang {page}/{totalPages} - {total} tài sản
        </span>
        {page > 1 ? <Link href={pageHref(page - 1)}>Trang trước</Link> : null}
        {page < totalPages ? <Link href={pageHref(page + 1)}>Trang sau</Link> : null}
      </div>
    </div>
  );
}
