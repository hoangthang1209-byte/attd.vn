"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import MediaPicker from "@/components/admin/media/MediaPicker";

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  skuCode: string | null;
  description: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  imageUrl: string | null;
  sortOrder: number;
  parentId: string | null;
  parentName: string | null;
  productCount: number;
};

type CategoryForm = {
  name: string;
  slug: string;
  skuCode: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  imageUrl: string;
  sortOrder: string;
  parentId: string;
};

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

const emptyForm = (): CategoryForm => ({
  name: "",
  slug: "",
  skuCode: "",
  description: "",
  seoTitle: "",
  seoDescription: "",
  imageUrl: "",
  sortOrder: "0",
  parentId: "",
});

export default function CategoryAdminManager() {
  const router = useRouter();
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CategoryForm>(emptyForm());
  const [slugEdited, setSlugEdited] = useState(false);
  const [skuCodeEdited, setSkuCodeEdited] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/products/categories");
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch {
      setMessage({ type: "error", text: "Không thể tải danh mục." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setSlugEdited(false);
    setSkuCodeEdited(false);
    setShowForm(true);
    setMessage(null);
  }

  function startEdit(cat: CategoryRow) {
    setEditingId(cat.id);
    setForm({
      name: cat.name,
      slug: cat.slug,
      skuCode: cat.skuCode ?? "",
      description: cat.description ?? "",
      seoTitle: cat.seoTitle ?? "",
      seoDescription: cat.seoDescription ?? "",
      imageUrl: cat.imageUrl ?? "",
      sortOrder: String(cat.sortOrder),
      parentId: cat.parentId ?? "",
    });
    setSlugEdited(true);
    setSkuCodeEdited(true);
    setShowForm(true);
    setMessage(null);
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm());
  }

  useEffect(() => {
    if (!showForm || skuCodeEdited || !form.name.trim()) return;

    const timer = window.setTimeout(() => {
      const params = new URLSearchParams({ name: form.name.trim() });
      if (editingId) params.set("excludeId", editingId);
      void fetch(`/api/admin/products/categories/code-preview?${params}`)
        .then((r) => r.json())
        .then((data: { code?: string }) => {
          if (data.code && !skuCodeEdited) {
            setForm((f) => ({ ...f, skuCode: data.code ?? "" }));
          }
        })
        .catch(() => {});
    }, 300);

    return () => window.clearTimeout(timer);
  }, [form.name, showForm, skuCodeEdited, editingId]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);

    if (!form.name.trim() || !form.slug.trim()) {
      setMessage({ type: "error", text: "Tên danh mục và slug là bắt buộc." });
      return;
    }

    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim(),
      skuCode: form.skuCode.trim() || null,
      description: form.description.trim() || null,
      seoTitle: form.seoTitle.trim() || null,
      seoDescription: form.seoDescription.trim() || null,
      imageUrl: form.imageUrl.trim() || null,
      sortOrder: Number(form.sortOrder) || 0,
      parentId: form.parentId.trim() || null,
    };

    setSaving(true);
    try {
      const url = editingId
        ? `/api/admin/products/categories/${editingId}`
        : "/api/admin/products/categories";
      const res = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) {
        setMessage({ type: "error", text: data.message ?? "Không thể lưu danh mục." });
        return;
      }
      setMessage({
        type: "success",
        text: editingId ? "Đã cập nhật danh mục." : "Đã thêm danh mục mới.",
      });
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm());
      await load();
      router.refresh();
    } catch {
      setMessage({ type: "error", text: "Lỗi kết nối máy chủ." });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, name: string, productCount: number) {
    if (productCount > 0) {
      setMessage({
        type: "error",
        text: `Không thể xóa "${name}" — danh mục đang có ${productCount} sản phẩm.`,
      });
      return;
    }
    if (!window.confirm(`Xóa danh mục "${name}"?`)) return;

    setDeleting(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/products/categories/${id}`, { method: "DELETE" });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) {
        setMessage({ type: "error", text: data.message ?? "Không thể xóa danh mục." });
        return;
      }
      setMessage({ type: "success", text: "Đã xóa danh mục." });
      if (editingId === id) cancelForm();
      await load();
      router.refresh();
    } catch {
      setMessage({ type: "error", text: "Lỗi kết nối máy chủ." });
    } finally {
      setDeleting(false);
    }
  }

  const parentOptions = categories.filter((c) => c.id !== editingId);

  return (
    <div className="admin-category-page">
      <div className="admin-category-toolbar">
        <p className="admin-field-hint" style={{ margin: 0 }}>
          Quản lý danh mục sản phẩm — ảnh, mã, thứ tự hiển thị và SEO.
        </p>
        {!showForm && (
          <button type="button" className="admin-btn admin-btn--primary" onClick={startCreate}>
            + Thêm danh mục
          </button>
        )}
      </div>

      {message && (
        <p className={message.type === "error" ? "admin-error" : "admin-success"}>{message.text}</p>
      )}

      {showForm && (
        <form onSubmit={(e) => void save(e)} className="admin-catalog-fieldset admin-category-form">
          <h3 className="admin-subtitle" style={{ margin: "0 0 16px" }}>
            {editingId ? "Sửa danh mục" : "Thêm danh mục"}
          </h3>

          <div className="admin-form-grid admin-form-grid--2">
            <div>
              <label className="admin-label">Tên danh mục *</label>
              <input
                className="admin-input"
                value={form.name}
                onChange={(e) => {
                  const v = e.target.value;
                  setForm((f) => ({
                    ...f,
                    name: v,
                    slug: slugEdited ? f.slug : toSlug(v),
                  }));
                }}
                required
              />
            </div>
            <div>
              <label className="admin-label">Slug *</label>
              <input
                className="admin-input"
                value={form.slug}
                onChange={(e) => {
                  setSlugEdited(true);
                  setForm((f) => ({ ...f, slug: e.target.value }));
                }}
                required
              />
              <p className="admin-field-hint">attd.vn/{form.slug || "danh-muc"}</p>
            </div>
            <div>
              <label className="admin-label">Mã danh mục</label>
              <input
                className="admin-input"
                value={form.skuCode}
                onChange={(e) => {
                  setSkuCodeEdited(true);
                  setForm((f) => ({ ...f, skuCode: e.target.value.toUpperCase() }));
                }}
                placeholder="Tự động từ tên (vd. TS, POLO, TOTE)"
              />
              {!skuCodeEdited && form.name.trim() && (
                <p className="admin-field-hint">
                  Mã dự kiến sẽ được tạo tự động khi lưu. Có thể chỉnh tay nếu cần.
                </p>
              )}
            </div>
            <div>
              <label className="admin-label">Thứ tự hiển thị</label>
              <input
                className="admin-input"
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
              />
            </div>
            {parentOptions.length > 0 && (
              <div>
                <label className="admin-label">Danh mục cha</label>
                <select
                  className="admin-input"
                  value={form.parentId}
                  onChange={(e) => setForm((f) => ({ ...f, parentId: e.target.value }))}
                >
                  <option value="">— Không có —</option>
                  {parentOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div style={{ marginTop: 16 }}>
            <label className="admin-label">Mô tả ngắn</label>
            <textarea
              className="admin-input"
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Mô tả hiển thị trên trang danh mục công khai"
            />
          </div>

          <div style={{ marginTop: 16 }}>
            <label className="admin-label">Ảnh danh mục</label>
            <div className="admin-category-image-row">
              <MediaPicker
                folder="categories"
                usageType="auto"
                value={form.imageUrl || null}
                onChange={(url) => {
                  setForm((prev) => ({ ...prev, imageUrl: url }));
                }}
              />
              <input
                className="admin-input"
                value={form.imageUrl}
                onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
                placeholder="Hoặc dán URL ảnh"
              />
              {form.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={form.imageUrl}
                  alt="Xem trước"
                  className="admin-category-thumb-preview"
                />
              )}
            </div>
          </div>

          <fieldset className="admin-catalog-fieldset" style={{ marginTop: 20 }}>
            <legend className="admin-subtitle">SEO</legend>
            <div className="admin-form-grid admin-form-grid--2">
              <div>
                <label className="admin-label">SEO title</label>
                <input
                  className="admin-input"
                  value={form.seoTitle}
                  onChange={(e) => setForm((f) => ({ ...f, seoTitle: e.target.value }))}
                  maxLength={255}
                />
              </div>
              <div>
                <label className="admin-label">SEO description</label>
                <textarea
                  className="admin-input"
                  rows={2}
                  value={form.seoDescription}
                  onChange={(e) => setForm((f) => ({ ...f, seoDescription: e.target.value }))}
                  maxLength={500}
                />
              </div>
            </div>
          </fieldset>

          <div className="admin-form-actions" style={{ marginTop: 20 }}>
            <button type="submit" className="admin-btn admin-btn--primary" disabled={saving}>
              {saving ? "Đang lưu…" : "Lưu danh mục"}
            </button>
            <button type="button" className="admin-btn admin-btn--secondary" onClick={cancelForm}>
              Hủy
            </button>
          </div>
        </form>
      )}

      <div className="admin-catalog-fieldset">
        <h3 className="admin-subtitle" style={{ margin: "0 0 12px" }}>
          Danh sách danh mục ({categories.length})
        </h3>

        {loading ? (
          <p className="admin-field-hint">Đang tải…</p>
        ) : categories.length === 0 ? (
          <p className="admin-field-hint">Chưa có danh mục nào.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table admin-category-table">
              <thead>
                <tr>
                  <th>Ảnh</th>
                  <th>Tên danh mục</th>
                  <th>Slug</th>
                  <th>Mã danh mục</th>
                  <th>Sản phẩm</th>
                  <th>Thứ tự</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr key={cat.id}>
                    <td>
                      {cat.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={cat.imageUrl}
                          alt={cat.name}
                          className="admin-category-list-thumb"
                        />
                      ) : (
                        <span className="admin-field-hint">—</span>
                      )}
                    </td>
                    <td>
                      <strong>{cat.name}</strong>
                      {cat.parentName && (
                        <span className="admin-field-hint" style={{ display: "block" }}>
                          Thuộc: {cat.parentName}
                        </span>
                      )}
                    </td>
                    <td><code>{cat.slug}</code></td>
                    <td>{cat.skuCode ?? "—"}</td>
                    <td>{cat.productCount}</td>
                    <td>{cat.sortOrder}</td>
                    <td>
                      <div className="admin-table-actions">
                        <button
                          type="button"
                          className="admin-btn admin-btn--secondary admin-btn--xs"
                          onClick={() => startEdit(cat)}
                        >
                          Sửa
                        </button>
                        <Link
                          href={`/${cat.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="admin-btn admin-btn--secondary admin-btn--xs"
                        >
                          Xem
                        </Link>
                        <button
                          type="button"
                          className="admin-btn admin-btn--secondary admin-btn--xs"
                          disabled={deleting || cat.productCount > 0}
                          title={
                            cat.productCount > 0
                              ? "Không thể xóa danh mục đang có sản phẩm"
                              : undefined
                          }
                          style={cat.productCount === 0 ? { color: "#dc2626" } : undefined}
                          onClick={() => void handleDelete(cat.id, cat.name, cat.productCount)}
                        >
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
