"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import MediaPicker from "@/components/admin/media/MediaPicker";
import CategoryListThumbnail from "@/components/admin/products/CategoryListThumbnail";
import CategoryQuickEditModal, {
  type CategoryQuickEditRecord,
} from "@/components/admin/products/CategoryQuickEditModal";
import {
  buildLevel1ParentOptions,
  flattenCategoryTree,
  formatParentHint,
  getCategoryIndentPx,
} from "@/features/categories/category-tree-utils";
import {
  CATEGORY_NAME_EN_REQUIRED,
  CATEGORY_NAME_VI_REQUIRED,
  isValidFourLetterCategoryCode,
} from "@/features/categories/category-admin-constants";
import CategoryGeneratedCodeField, {
  emptyCategoryCodePreview,
  type CategoryCodePreviewState,
} from "@/components/admin/products/CategoryGeneratedCodeField";
import { getCategoryAdminDetailHref } from "@/features/categories/category-admin-routes";
import { publicCategoryHref } from "@/features/categories/public-category-url";
import { fetchCategoryCodePreview } from "@/features/categories/category-code-preview.client";
import { useAdminMutation } from "@/hooks/useAdminAction";
import PublishQualityChecklist from "@/components/admin/products/PublishQualityChecklist";
import {
  SEO_PUBLISH_QUALITY_GATE_FAILED,
  SEO_PUBLISH_QUALITY_SUMMARY,
  buildCategoryPublishChecklist,
  evaluateCategoryPublishQuality,
} from "@/lib/seo/publish-quality-gate";
import { isIndexableCategoryLanding } from "@/lib/seo/indexable-category-routes";
import { toSlug } from "@/lib/slug";

type CategoryRow = CategoryQuickEditRecord & {
  parentName: string | null;
  parentNameEn?: string | null;
  nameEn?: string | null;
  isActive?: boolean;
  codeFormat?: "valid" | "legacy";
  childCount?: number;
};

type CategoryForm = {
  name: string;
  nameEn: string;
  slug: string;
  savedSkuCode: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  imageUrl: string;
  sortOrder: string;
  parentId: string;
  isActive: boolean;
};

const emptyForm = (): CategoryForm => ({
  name: "",
  nameEn: "",
  slug: "",
  savedSkuCode: "",
  description: "",
  seoTitle: "",
  seoDescription: "",
  imageUrl: "",
  sortOrder: "0",
  parentId: "",
  isActive: true,
});

async function fetchCategoryRows(): Promise<CategoryRow[]> {
  const res = await fetch("/api/admin/products/categories");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export default function CategoryAdminManager() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mutate = useAdminMutation();
  const tableWrapRef = useRef<HTMLDivElement>(null);
  const editCategoryHandledRef = useRef<string | null>(null);
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
  const [codePreview, setCodePreview] = useState<CategoryCodePreviewState>(emptyCategoryCodePreview());
  const [regenerateOnSave, setRegenerateOnSave] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const categoryPublishQualityInput = useMemo(
    () => ({
      name: form.name,
      slug: form.slug,
      description: form.description,
      seoTitle: form.seoTitle,
      seoDescription: form.seoDescription,
      imageUrl: form.imageUrl,
    }),
    [form],
  );

  const categoryPublishChecklist = useMemo(
    () => buildCategoryPublishChecklist(categoryPublishQualityInput),
    [categoryPublishQualityInput],
  );

  const editingCategory = useMemo(
    () => (editingId ? categories.find((cat) => cat.id === editingId) : null),
    [categories, editingId],
  );

  const showCategoryLegacySeoWarning = Boolean(
    editingCategory &&
      isIndexableCategoryLanding(editingCategory.slug) &&
      !evaluateCategoryPublishQuality(categoryPublishQualityInput, {
        requireIndexableLandingFields: true,
      }).valid,
  );

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

  function openFullEditor(cat: CategoryRow) {
    setEditingId(cat.id);
    setForm({
      name: cat.name,
      nameEn: cat.nameEn ?? "",
      slug: cat.slug,
      savedSkuCode: cat.skuCode ?? "",
      description: cat.description ?? "",
      seoTitle: cat.seoTitle ?? "",
      seoDescription: cat.seoDescription ?? "",
      imageUrl: cat.imageUrl ?? "",
      sortOrder: String(cat.sortOrder),
      parentId: cat.parentId ?? "",
      isActive: cat.isActive !== false,
    });
    setSlugEdited(true);
    setRegenerateOnSave(false);
    setCodePreview(emptyCategoryCodePreview());
    setShowForm(true);
    setQuickEditCategory(null);
    setFieldErrors({});
    setMessage(null);
  }

  useEffect(() => {
    const editId = searchParams.get("editCategory");
    if (!editId || loading || editCategoryHandledRef.current === editId) return;
    const cat = categories.find((row) => row.id === editId);
    if (!cat) return;
    editCategoryHandledRef.current = editId;
    queueMicrotask(() => openFullEditor(cat));
  }, [searchParams, loading, categories]);

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setSlugEdited(false);
    setRegenerateOnSave(false);
    setCodePreview(emptyCategoryCodePreview());
    setShowForm(true);
    setMessage(null);
    setFieldErrors({});
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm());
    setRegenerateOnSave(false);
    setCodePreview(emptyCategoryCodePreview());
    setFieldErrors({});
  }

  const showLegacyCodeNotice = Boolean(
    editingId && form.savedSkuCode && !isValidFourLetterCategoryCode(form.savedSkuCode),
  );

  const loadCodePreview = useCallback(async (options?: { markRegenerate?: boolean }) => {
    if (!form.nameEn.trim()) {
      setCodePreview(emptyCategoryCodePreview());
      return;
    }

    setCodePreview((current) => ({ ...current, status: "loading", message: "Đang tạo mã..." }));
    const preview = await fetchCategoryCodePreview({
      nameEn: form.nameEn,
      excludeId: editingId ?? undefined,
    });
    setCodePreview({
      ...preview,
      isPreview: Boolean(editingId) || Boolean(options?.markRegenerate),
    });
    if (options?.markRegenerate) {
      setRegenerateOnSave(true);
    }
  }, [editingId, form.nameEn]);

  useEffect(() => {
    if (!showForm || !form.nameEn.trim()) return;

    const timer = window.setTimeout(() => {
      void loadCodePreview();
    }, 300);

    return () => window.clearTimeout(timer);
  }, [form.nameEn, showForm, loadCodePreview]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    setFieldErrors({});

    if (!form.name.trim() || !form.slug.trim()) {
      setFieldErrors({
        ...(!form.name.trim() ? { name: CATEGORY_NAME_VI_REQUIRED } : {}),
        ...(!form.slug.trim() ? { slug: "Slug là bắt buộc." } : {}),
      });
      setMessage({ type: "error", text: "Vui lòng kiểm tra các trường bắt buộc." });
      return;
    }

    if (!editingId && !form.nameEn.trim()) {
      setFieldErrors({ nameEn: CATEGORY_NAME_EN_REQUIRED });
      setMessage({ type: "error", text: CATEGORY_NAME_EN_REQUIRED });
      return;
    }

    if (!editingId && codePreview.status === "error") {
      setFieldErrors({ skuCode: codePreview.message });
      setMessage({ type: "error", text: codePreview.message });
      return;
    }

    const payload = {
      name: form.name.trim(),
      nameEn: form.nameEn.trim() || null,
      slug: form.slug.trim(),
      description: form.description.trim() || null,
      seoTitle: form.seoTitle.trim() || null,
      seoDescription: form.seoDescription.trim() || null,
      imageUrl: form.imageUrl.trim() || null,
      sortOrder: Number(form.sortOrder) || 0,
      parentId: form.parentId.trim() || null,
      isActive: form.isActive,
      ...(editingId && regenerateOnSave ? { regenerateCode: true } : {}),
    };

    setSaving(true);
    await mutate({
      loadingMessage: "Đang lưu thông tin…",
      successMessage: "Đã lưu thông tin.",
      onError: (message) => setMessage({ type: "error", text: message }),
      action: async () => {
        const url = editingId
          ? `/api/admin/products/categories/${editingId}`
          : "/api/admin/products/categories";
        const res = await fetch(url, {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json() as {
          message?: string;
          error?: string;
          code?: string;
          fieldErrors?: Record<string, string>;
        };
        if (!res.ok) {
          const summary =
            data.code === SEO_PUBLISH_QUALITY_GATE_FAILED
              ? SEO_PUBLISH_QUALITY_SUMMARY
              : data.message ?? data.error ?? "Không thể lưu danh mục.";
          setFieldErrors(data.fieldErrors ?? {});
          return {
            ok: false as const,
            message: summary,
          };
        }
        return { ok: true as const, data: true };
      },
      onSuccess: async () => {
        setShowForm(false);
        setEditingId(null);
        setForm(emptyForm());
        await load(true);
        router.refresh();
      },
    });
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

  const parentOptions = buildLevel1ParentOptions(categories, editingId);

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
              <label className="admin-label">Tên danh mục tiếng Việt *</label>
              <input
                className={`admin-input${fieldErrors.name ? " admin-input--error" : ""}`}
                value={form.name}
                data-field="name"
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
              {fieldErrors.name && <p className="admin-field-error" role="alert">{fieldErrors.name}</p>}
            </div>
            <div>
              <label className="admin-label">Tên danh mục tiếng Anh *</label>
              <input
                className={`admin-input${fieldErrors.nameEn ? " admin-input--error" : ""}`}
                value={form.nameEn}
                data-field="nameEn"
                onChange={(e) => setForm((f) => ({ ...f, nameEn: e.target.value }))}
                required={!editingId}
                placeholder="Polo Shirts"
              />
              {fieldErrors.nameEn && <p className="admin-field-error" role="alert">{fieldErrors.nameEn}</p>}
            </div>
            <CategoryGeneratedCodeField
              value={editingId ? form.savedSkuCode : codePreview.code}
              preview={codePreview}
              legacyNotice={showLegacyCodeNotice}
              disabled={saving}
              onRegenerate={() => void loadCodePreview({ markRegenerate: true })}
            />
            {fieldErrors.skuCode && (
              <p className="admin-field-error" role="alert">{fieldErrors.skuCode}</p>
            )}
            <div>
              <label className="admin-label">Slug *</label>
              <input
                className={`admin-input${fieldErrors.slug ? " admin-input--error" : ""}`}
                value={form.slug}
                data-field="slug"
                onChange={(e) => {
                  setSlugEdited(true);
                  setForm((f) => ({ ...f, slug: e.target.value }));
                }}
                required
              />
              {fieldErrors.slug && <p className="admin-field-error" role="alert">{fieldErrors.slug}</p>}
              <p className="admin-field-hint">attd.vn/{form.slug || "danh-muc"}</p>
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
              <p className="admin-field-hint">Chỉ chọn danh mục cấp 1 (loại sản phẩm).</p>
            </div>
            <div>
              <label className="admin-label">Trạng thái</label>
              <select
                className="admin-input"
                value={form.isActive ? "active" : "inactive"}
                onChange={(e) =>
                  setForm((f) => ({ ...f, isActive: e.target.value === "active" }))
                }
              >
                <option value="active">Đang hoạt động</option>
                <option value="inactive">Tạm ẩn</option>
              </select>
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
          </div>

          <div style={{ marginTop: 16 }}>
            <label className="admin-label">Mô tả ngắn</label>
            <textarea
              className={`admin-input${fieldErrors.description ? " admin-input--error" : ""}`}
              rows={3}
              data-field="description"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Mô tả hiển thị trên trang danh mục công khai"
            />
            {fieldErrors.description && (
              <p className="admin-field-error" role="alert">{fieldErrors.description}</p>
            )}
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
                className={`admin-input${fieldErrors.imageUrl ? " admin-input--error" : ""}`}
                data-field="imageUrl"
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
            {fieldErrors.imageUrl && (
              <p className="admin-field-error" role="alert">{fieldErrors.imageUrl}</p>
            )}
          </div>

          <PublishQualityChecklist
            items={categoryPublishChecklist}
            legacyWarning={showCategoryLegacySeoWarning}
          />

          <fieldset className="admin-catalog-fieldset" style={{ marginTop: 20 }}>
            <legend className="admin-subtitle">SEO</legend>
            <div className="admin-form-grid admin-form-grid--2">
              <div>
                <label className="admin-label">SEO title</label>
                <input
                  className={`admin-input${fieldErrors.seoTitle ? " admin-input--error" : ""}`}
                  data-field="seoTitle"
                  value={form.seoTitle}
                  onChange={(e) => setForm((f) => ({ ...f, seoTitle: e.target.value }))}
                  maxLength={255}
                />
                {fieldErrors.seoTitle && (
                  <p className="admin-field-error" role="alert">{fieldErrors.seoTitle}</p>
                )}
              </div>
              <div>
                <label className="admin-label">SEO description</label>
                <textarea
                  className={`admin-input${fieldErrors.seoDescription ? " admin-input--error" : ""}`}
                  rows={2}
                  data-field="seoDescription"
                  value={form.seoDescription}
                  onChange={(e) => setForm((f) => ({ ...f, seoDescription: e.target.value }))}
                  maxLength={500}
                />
                {fieldErrors.seoDescription && (
                  <p className="admin-field-error" role="alert">{fieldErrors.seoDescription}</p>
                )}
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
                  <th className="admin-category-table__image-cell">Ảnh</th>
                  <th>Tên tiếng Việt</th>
                  <th>Tên tiếng Anh</th>
                  <th>Mã</th>
                  <th>Danh mục cha</th>
                  <th>Sản phẩm</th>
                  <th>Trạng thái</th>
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
                        <CategoryListThumbnail imageUrl={cat.imageUrl} name={cat.name} />
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
                      <td>{cat.nameEn?.trim() ? cat.nameEn : <span className="admin-field-hint">—</span>}</td>
                      <td>
                        <code
                          className={
                            cat.codeFormat === "legacy"
                              ? "admin-category-table__code--legacy"
                              : cat.skuCode && !isValidFourLetterCategoryCode(cat.skuCode)
                                ? "admin-category-table__code--invalid"
                                : undefined
                          }
                        >
                          {cat.skuCode ?? "—"}
                        </code>
                      </td>
                      <td>{cat.parentName ?? "—"}</td>
                      <td>{cat.productCount}</td>
                      <td>{cat.isActive === false ? "Tạm ẩn" : "Hoạt động"}</td>
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
                            href={getCategoryAdminDetailHref(cat.id)}
                            className="admin-btn admin-btn--secondary admin-btn--xs"
                          >
                            Chi tiết
                          </Link>
                          <Link
                            href={publicCategoryHref(cat.slug)}
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
