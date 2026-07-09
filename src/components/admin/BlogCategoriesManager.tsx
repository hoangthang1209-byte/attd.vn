"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { BlogCategoryRecord } from "@/features/blog/types";
import { toSlug } from "@/lib/slug";
import { AdminLoadingState } from "@/components/admin/AdminUi";

type CategoryForm = {
  name: string;
  slug: string;
  description: string;
  isVisible: boolean;
};

const emptyForm = (): CategoryForm => ({
  name: "",
  slug: "",
  description: "",
  isVisible: true,
});

export default function BlogCategoriesManager() {
  const router = useRouter();
  const [categories, setCategories] = useState<BlogCategoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(
    null
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CategoryForm>(emptyForm());
  const [slugEdited, setSlugEdited] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/blog/categories");
      const data = await res.json();
      setCategories(Array.isArray(data.categories) ? data.categories : []);
    } catch {
      setMessage({ type: "error", text: "Không thể tải danh mục" });
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
  }

  function startEdit(cat: BlogCategoryRecord) {
    setEditingId(cat.id);
    setForm({
      name: cat.name,
      slug: cat.slug,
      description: cat.description ?? "",
      isVisible: cat.isVisible,
    });
    setSlugEdited(true);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);

    if (!form.name.trim() || !form.slug.trim()) {
      setMessage({ type: "error", text: "Tên và slug là bắt buộc." });
      return;
    }

    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim(),
      description: form.description.trim() || null,
      isVisible: form.isVisible,
    };

    const url = editingId ? `/api/blog/categories/${editingId}` : "/api/blog/categories";
    const method = editingId ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (!res.ok) {
      setMessage({ type: "error", text: data.message ?? "Lưu thất bại" });
      return;
    }

    setMessage({ type: "success", text: editingId ? "Đã cập nhật danh mục." : "Đã tạo danh mục." });
    startCreate();
    await load();
    router.refresh();
  }

  async function remove(id: string) {
    if (!window.confirm("Xóa danh mục này?")) return;
    const res = await fetch(`/api/blog/categories/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      setMessage({ type: "error", text: data.message ?? "Xóa thất bại" });
      return;
    }
    setMessage({ type: "success", text: "Đã xóa danh mục." });
    if (editingId === id) startCreate();
    await load();
    router.refresh();
  }

  async function toggleVisible(cat: BlogCategoryRecord) {
    const res = await fetch(`/api/blog/categories/${cat.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isVisible: !cat.isVisible }),
    });
    if (!res.ok) {
      const data = await res.json();
      setMessage({ type: "error", text: data.message ?? "Cập nhật thất bại" });
      return;
    }
    await load();
    router.refresh();
  }

  return (
    <div className="admin-panel">
      <div className="admin-panel-header">
        <Link href="/admin/blog" className="admin-btn admin-btn--secondary">
          ← Bài viết
        </Link>
      </div>

      {message && (
        <p className={`admin-message admin-message--${message.type}`}>{message.text}</p>
      )}

      <form className="admin-sidebar-card" onSubmit={save}>
        <h3 className="admin-sidebar-title">
          {editingId ? "Sửa danh mục" : "Tạo danh mục"}
        </h3>
        <div className="admin-field">
          <label className="admin-label">Tên</label>
          <input
            className="admin-input"
            value={form.name}
            onChange={(e) => {
              const name = e.target.value;
              setForm((f) => ({
                ...f,
                name,
                slug: slugEdited ? f.slug : toSlug(name),
              }));
            }}
          />
        </div>
        <div className="admin-field">
          <label className="admin-label">Slug</label>
          <input
            className="admin-input"
            value={form.slug}
            onChange={(e) => {
              setSlugEdited(true);
              setForm((f) => ({ ...f, slug: e.target.value }));
            }}
          />
          <p className="admin-field-hint">/blog/danh-muc/{form.slug || "slug"}</p>
        </div>
        <div className="admin-field">
          <label className="admin-label">Mô tả</label>
          <textarea
            className="admin-textarea"
            rows={3}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </div>
        <label className="admin-checkbox-item">
          <input
            type="checkbox"
            checked={form.isVisible}
            onChange={(e) => setForm((f) => ({ ...f, isVisible: e.target.checked }))}
          />
          <span>Hiển thị công khai</span>
        </label>
        <div className="admin-form-actions">
          <button type="submit" className="admin-btn">
            {editingId ? "Lưu" : "Tạo"}
          </button>
          {editingId && (
            <button type="button" className="admin-btn admin-btn--secondary" onClick={startCreate}>
              Hủy
            </button>
          )}
        </div>
      </form>

      {loading ? (
        <AdminLoadingState label="Đang tải danh mục blog…" />
      ) : categories.length === 0 ? (
        <div className="admin-empty-state">
          <p>Chưa có danh mục blog.</p>
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Tên</th>
                <th>Slug</th>
                <th>Bài viết</th>
                <th>Hiển thị</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat.id}>
                  <td>{cat.name}</td>
                  <td>
                    <code>{cat.slug}</code>
                  </td>
                  <td>{cat.postCount ?? 0}</td>
                  <td>{cat.isVisible ? "Có" : "Ẩn"}</td>
                  <td>
                    <div className="admin-table-actions">
                      <button type="button" onClick={() => startEdit(cat)}>
                        Sửa
                      </button>
                      <button type="button" onClick={() => void toggleVisible(cat)}>
                        {cat.isVisible ? "Ẩn" : "Hiện"}
                      </button>
                      <button type="button" onClick={() => void remove(cat.id)}>
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
  );
}
