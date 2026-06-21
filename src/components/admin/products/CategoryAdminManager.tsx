"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import MediaPicker from "@/components/admin/media/MediaPicker";
import CategoryQuickEditModal, {
  type CategoryQuickEditRecord,
} from "@/components/admin/products/CategoryQuickEditModal";
import {
  buildHierarchicalParentOptions,
  flattenCategoryTree,
  formatParentHint,
  getCategoryIndentPx,
} from "@/features/categories/category-tree-utils";
import { useAdminMutation } from "@/hooks/useAdminAction";
import { parseAdminJsonResponse } from "@/lib/admin/adminMutation";
import { toSlug } from "@/lib/slug";

type CategoryRow = CategoryQuickEditRecord & {
  parentName: string | null;
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

async function fetchCategoryRows(): Promise<CategoryRow[]> {
  const res = await fetch("/api/admin/products/categories");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export default function CategoryAdminManager() {
  const router = useRouter();
  const mutate = useAdminMutation();
  const tableWrapRef = useRef<HTMLDivElement>(null);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(
    null,
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [quickEditCategory, setQuickEditCategory] = useState<CategoryRow | null>(null);
  const [form, setForm] = useState<CategoryForm>(emptyForm());
  const [slugEdited, setSlugEdited] = useState(false);
  const [skuCodeEdited, setSkuCodeEdited] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const flattenedCategories = useMemo(
    () => flattenCategoryTree(categories),
    [categories],
  );

  const load = useCallback(async (preserveScroll = false) => {
    const scrollTop = preserveScroll ? (tableWrapRef.current?.scrollTop ?? 0) : 0;
    setLoading(true);
    try {
      const rows = await fetchCategoryRows();
      setCategories(rows);
      if (preserveScroll) {
        requestAnimationFrame(() => {
          if (tableWrapRef.current) {
            tableWrapRef.current.scrollTop = scrollTop;
          }
        });
      }
    } catch {
      setMessage({ type: "error", text: "Không thể tải danh mục." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void fetchCategoryRows()
      .then((rows) => {
        if (active) setCategories(rows);
      })
      .catch(() => {
        if (active) setMessage({ type: "error", text: "Không thể tải danh mục." });
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setSlugEdited(false);
    setSkuCodeEdited(false);
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
    const saved = await mutate({
      loadingMessage: "Đang lưu thông tin…",
      successMessage: "Đã lưu thông tin.",
      action: async () => {
        const url = editingId
          ? `/api/admin/products/categories/${editingId}`
          : "/api/admin/products/categories";
        const res = await fetch(url, {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        return parseAdminJsonResponse(res, () => true);
      },
      onSuccess: async () => {
        setShowForm(false);
        setEditingId(null);
        setForm(emptyForm());
        await load(true);
        router.refresh();
      },
    });
    if (!saved) {
      setMessage({ type: "error", text: "Không thể lưu danh mục." });
    }
    setSaving(false);
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
      if (quickEditCategory?.id === id) setQuickEditCategory(null);
      await load(true);
      router.refresh();
    } catch {
      setMessage({ type: "error", text: "Lỗi kết nối máy chủ." });
    } finally {
      setDeleting(false);
    }
  }

  async function handleQuickEditSaved() {
    await load(true);
    router.refresh();
  }

  const parentOptions = buildHierarchicalParentOptions(categories, editingId);

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
            <div>
              <label className="admin-label">Danh mục cha</label>
              <select
                className="admin-input"
                value={form.parentId}
                onChange={(e) => setForm((f) => ({ ...f, parentId: e.target.value }))}
              >
                <option value="">— Không có danh mục cha —</option>
                {parentOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
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
          <div className="admin-table-wrap" ref={tableWrapRef}>
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
                {flattenedCategories.map((cat) => {
                  const parentHint = cat.isRoot
                    ? null
                    : formatParentHint(cat.parentPathNames);
                  const indentPx = getCategoryIndentPx(cat.depth);

                  return (
                    <tr
                      key={cat.id}
                      className={
                        cat.isRoot
                          ? "admin-category-table__row--root"
                          : "admin-category-table__row--child"
                      }
                    >
                      <td className="admin-category-table__image-cell">
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
                      <td className="admin-category-table__name-cell">
                        <div
                          className="admin-category-table__name-inner"
                          style={{ paddingInlineStart: indentPx }}
                        >
                          {!cat.isRoot && (
                            <span className="admin-category-table__branch" aria-hidden="true">
                              ↳
                            </span>
                          )}
                          <div className="admin-category-table__name-text">
                            <span
                              className={
                                cat.isRoot
                                  ? "admin-category-table__name--root"
                                  : "admin-category-table__name--child"
                              }
                            >
                              {cat.name}
                            </span>
                            {parentHint && (
                              <span className="admin-category-table__parent-hint">
                                {parentHint}
                              </span>
                            )}
                            {cat.isOrphan && (
                              <span className="admin-category-table__orphan-hint">
                                Danh mục cha không tồn tại
                              </span>
                            )}
                          </div>
                        </div>
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
                            onClick={() => setQuickEditCategory(cat)}
                          >
                            Sửa nhanh
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
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CategoryQuickEditModal
        key={quickEditCategory?.id ?? "closed"}
        open={quickEditCategory != null}
        category={quickEditCategory}
        allCategories={categories}
        onClose={() => setQuickEditCategory(null)}
        onSaved={handleQuickEditSaved}
      />
    </div>
  );
}
