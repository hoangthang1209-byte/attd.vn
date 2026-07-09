"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import AdminQuickCreateShell from "@/components/admin/AdminQuickCreateShell";
import MediaPicker from "@/components/admin/media/MediaPicker";
import {
  buildLevel1ParentOptions,
  validateCategoryParentSelection,
  type CategoryTreeItem,
} from "@/features/categories/category-tree-utils";
import {
  CATEGORY_NAME_VI_REQUIRED,
  isValidFourLetterCategoryCode,
} from "@/features/categories/category-admin-constants";
import CategoryGeneratedCodeField, {
  emptyCategoryCodePreview,
  type CategoryCodePreviewState,
} from "@/components/admin/products/CategoryGeneratedCodeField";
import { fetchCategoryCodePreview } from "@/features/categories/category-code-preview.client";
import { getCategoryAdminDetailHref } from "@/features/categories/category-admin-routes";
import { useAdminMutation } from "@/hooks/useAdminAction";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";
import { isIndexableCategoryLanding } from "@/lib/seo/indexable-category-routes";
import {
  SEO_PUBLISH_QUALITY_GATE_FAILED,
  SEO_PUBLISH_QUALITY_SUMMARY,
  evaluateCategoryPublishQuality,
} from "@/lib/seo/publish-quality-gate";
import { toSlug } from "@/lib/slug";

export type CategoryQuickEditRecord = CategoryTreeItem & {
  slug: string;
  nameEn?: string | null;
  skuCode: string | null;
  description: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  imageUrl: string | null;
  productCount: number;
  isActive?: boolean;
  codeFormat?: "valid" | "legacy";
};

type Props = {
  open: boolean;
  category: CategoryQuickEditRecord | null;
  allCategories: CategoryQuickEditRecord[];
  onClose: () => void;
  onSaved: () => void | Promise<void>;
};

const FORM_ID = "category-quick-edit-form";

function useModalFocusTrap(open: boolean, containerRef: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return;
    const container = containerRef.current;
    if (!container) return;

    const focusableSelector =
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    function getFocusableElements() {
      if (!container) return [];
      return Array.from(container.querySelectorAll<HTMLElement>(focusableSelector)).filter(
        (element) => element.offsetParent !== null,
      );
    }

    const initialFocus = getFocusableElements()[0];
    initialFocus?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Tab") return;
      const focusable = getFocusableElements();
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, containerRef]);
}

export default function CategoryQuickEditModal({
  open,
  category,
  allCategories,
  onClose,
  onSaved,
}: Props) {
  if (!open || !category) return null;

  return (
    <CategoryQuickEditModalForm
      category={category}
      allCategories={allCategories}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}

function CategoryQuickEditModalForm({
  category,
  allCategories,
  onClose,
  onSaved,
}: {
  category: CategoryQuickEditRecord;
  allCategories: CategoryQuickEditRecord[];
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const mutate = useAdminMutation();
  const formContainerRef = useRef<HTMLDivElement>(null);
  const submitLock = useRef(false);
  const [pending, setPending] = useState(false);
  const [name, setName] = useState(category.name);
  const [nameEn, setNameEn] = useState(category.nameEn ?? "");
  const [slug, setSlug] = useState(category.slug);
  const [savedSkuCode] = useState(category.skuCode ?? "");
  const [sortOrder, setSortOrder] = useState(String(category.sortOrder));
  const [parentId, setParentId] = useState(category.parentId ?? "");
  const [isActive, setIsActive] = useState(category.isActive !== false);
  const [imageUrl, setImageUrl] = useState(category.imageUrl ?? "");
  const [slugEdited, setSlugEdited] = useState(false);
  const [codePreview, setCodePreview] = useState<CategoryCodePreviewState>(emptyCategoryCodePreview());
  const [regenerateOnSave, setRegenerateOnSave] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useModalFocusTrap(true, formContainerRef);

  const showLegacyCodeNotice = Boolean(savedSkuCode && !isValidFourLetterCategoryCode(savedSkuCode));

  const loadCodePreview = useCallback(async (options?: { markRegenerate?: boolean }) => {
    if (!nameEn.trim()) {
      setCodePreview(emptyCategoryCodePreview());
      return;
    }

    setCodePreview((current) => ({ ...current, status: "loading", message: "Đang tạo mã..." }));
    const preview = await fetchCategoryCodePreview({
      nameEn,
      excludeId: category.id,
    });
    setCodePreview({ ...preview, isPreview: true });
    if (options?.markRegenerate) {
      setRegenerateOnSave(true);
    }
  }, [category.id, nameEn]);

  useEffect(() => {
    if (!nameEn.trim()) return;

    const timer = window.setTimeout(() => {
      void loadCodePreview();
    }, 300);

    return () => window.clearTimeout(timer);
  }, [loadCodePreview, nameEn]);

  function resetAndClose() {
    if (pending) return;
    setFormError(null);
    setFieldErrors({});
    onClose();
  }

  function validateForm(): boolean {
    const nextFieldErrors: Record<string, string> = {};

    if (!name.trim()) {
      nextFieldErrors.name = CATEGORY_NAME_VI_REQUIRED;
    }
    if (!slug.trim()) {
      nextFieldErrors.slug = "Vui lòng nhập slug.";
    }
    if (regenerateOnSave && codePreview.status === "error") {
      nextFieldErrors.skuCode = codePreview.message;
    }

    const parentError = category
      ? validateCategoryParentSelection(
          category.id,
          parentId.trim() || null,
          allCategories,
        )
      : null;
    if (parentError) {
      nextFieldErrors.parentId = parentError;
    }

    setFieldErrors(nextFieldErrors);
    if (Object.keys(nextFieldErrors).length > 0) {
      setFormError("Vui lòng kiểm tra lại thông tin danh mục.");
      return false;
    }

    setFormError(null);
    return true;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!category || pending || submitLock.current) return;
    if (!validateForm()) return;

    submitLock.current = true;
    setPending(true);

    const payload = {
      name: name.trim(),
      nameEn: nameEn.trim() || null,
      slug: slug.trim(),
      description: category.description,
      seoTitle: category.seoTitle,
      seoDescription: category.seoDescription,
      imageUrl: imageUrl.trim() || null,
      sortOrder: Number(sortOrder) || 0,
      parentId: parentId.trim() || null,
      isActive,
      ...(regenerateOnSave ? { regenerateCode: true } : {}),
    };

    await mutate({
      loadingMessage: "Đang lưu thông tin…",
      successMessage: "Đã cập nhật danh mục",
      errorFallback: "Không thể lưu danh mục. Vui lòng kiểm tra lại thông tin.",
      onError: (message) => setFormError(message),
      action: async () => {
        const response = await fetch(`/api/admin/products/categories/${category.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        let body: Record<string, unknown> = {};
        try {
          body = (await response.json()) as Record<string, unknown>;
        } catch {
          if (!response.ok) {
            return { ok: false as const, message: undefined };
          }
          return { ok: false as const, message: "Phản hồi không hợp lệ từ máy chủ." };
        }

        if (!response.ok) {
          if (body.fieldErrors && typeof body.fieldErrors === "object") {
            setFieldErrors(body.fieldErrors as Record<string, string>);
          }
          const message =
            body.code === SEO_PUBLISH_QUALITY_GATE_FAILED
              ? SEO_PUBLISH_QUALITY_SUMMARY
              : (typeof body.message === "string" && body.message) ||
                (typeof body.error === "string" && body.error) ||
                undefined;
          return { ok: false as const, message };
        }

        return { ok: true as const, data: body };
      },
      onSuccess: async () => {
        await onSaved();
        resetAndClose();
      },
    });

    setPending(false);
    submitLock.current = false;
  }

  const parentOptions = buildLevel1ParentOptions(
    allCategories,
    category?.id ?? null,
  );

  const indexableSeoIncomplete = useMemo(() => {
    if (!isIndexableCategoryLanding(slug)) return false;
    return !evaluateCategoryPublishQuality(
      {
        name,
        slug,
        description: category.description,
        seoTitle: category.seoTitle,
        seoDescription: category.seoDescription,
        imageUrl: imageUrl || category.imageUrl,
      },
      { requireIndexableLandingFields: true },
    ).valid;
  }, [category, imageUrl, name, slug]);

  return (
    <AdminQuickCreateShell
      open
      title="Sửa nhanh danh mục"
      subtitle={category ? category.name : undefined}
      onClose={resetAndClose}
      pending={pending}
      size="wide"
      ariaLabel="Sửa nhanh danh mục"
      footer={
        <>
          <button
            type="button"
            className="admin-btn admin-btn--secondary"
            onClick={resetAndClose}
            disabled={pending}
          >
            Hủy
          </button>
          <AdminLoadingButton
            type="submit"
            form={FORM_ID}
            variant="primary"
            pending={pending}
            pendingLabel="Đang lưu danh mục..."
          >
            Lưu thay đổi
          </AdminLoadingButton>
        </>
      }
    >
      <div ref={formContainerRef}>
        {formError && <p className="admin-error">{formError}</p>}
        {indexableSeoIncomplete && (
          <p className="admin-field-hint admin-publish-quality-legacy-warning">
            Danh mục này cần hoàn thiện nội dung SEO trước khi có thể dùng làm trang đích.{" "}
            <Link href={getCategoryAdminDetailHref(category.id)}>
              Mở trình sửa đầy đủ
            </Link>
          </p>
        )}
        <form id={FORM_ID} noValidate onSubmit={(event) => void handleSubmit(event)}>
          <div className="admin-quick-create-grid">
            <div className="admin-field admin-quick-create-grid__full">
              <label className="admin-label">Ảnh đại diện</label>
              <div className="admin-category-image-row">
                <MediaPicker
                  folder="categories"
                  usageType="auto"
                  value={imageUrl || null}
                  onChange={(url) => setImageUrl(url)}
                />
                <input
                  className="admin-input"
                  value={imageUrl}
                  disabled={pending}
                  onChange={(event) => setImageUrl(event.target.value)}
                  placeholder="Hoặc dán URL ảnh"
                />
              </div>
            </div>

            <div className="admin-field">
              <label className="admin-label" htmlFor="quick-edit-category-name">
                Tên danh mục tiếng Việt *
              </label>
              <input
                id="quick-edit-category-name"
                className="admin-input"
                value={name}
                disabled={pending}
                onChange={(event) => {
                  const value = event.target.value;
                  setName(value);
                  if (!slugEdited) {
                    setSlug(toSlug(value));
                  }
                  if (fieldErrors.name) {
                    setFieldErrors((current) => {
                      const next = { ...current };
                      delete next.name;
                      return next;
                    });
                  }
                }}
              />
              {fieldErrors.name && <p className="admin-field-error">{fieldErrors.name}</p>}
            </div>

            <div className="admin-field">
              <label className="admin-label" htmlFor="quick-edit-category-name-en">
                Tên danh mục tiếng Anh
              </label>
              <input
                id="quick-edit-category-name-en"
                className="admin-input"
                value={nameEn}
                disabled={pending}
                onChange={(event) => setNameEn(event.target.value)}
                placeholder="Polo Shirts"
              />
            </div>

            <div className="admin-field">
              <label className="admin-label" htmlFor="quick-edit-category-slug">
                Slug *
              </label>
              <input
                id="quick-edit-category-slug"
                className="admin-input"
                value={slug}
                disabled={pending}
                onChange={(event) => {
                  setSlugEdited(true);
                  setSlug(event.target.value);
                  if (fieldErrors.slug) {
                    setFieldErrors((current) => {
                      const next = { ...current };
                      delete next.slug;
                      return next;
                    });
                  }
                }}
              />
              <p className="admin-field-hint">attd.vn/{slug || "danh-muc"}</p>
              {fieldErrors.slug && <p className="admin-field-error">{fieldErrors.slug}</p>}
            </div>

            <CategoryGeneratedCodeField
              id="quick-edit-category-code"
              value={savedSkuCode}
              preview={codePreview}
              legacyNotice={showLegacyCodeNotice}
              disabled={pending}
              onRegenerate={() => void loadCodePreview({ markRegenerate: true })}
            />
            {regenerateOnSave && category.productCount > 0 && (
              <p className="admin-field-hint admin-field-hint--warning">
                Thay đổi mã danh mục không tự động đổi mã {category.productCount} sản phẩm liên quan.
              </p>
            )}
            {fieldErrors.skuCode && <p className="admin-field-error">{fieldErrors.skuCode}</p>}

            <div className="admin-field">
              <label className="admin-label" htmlFor="quick-edit-category-status">
                Trạng thái
              </label>
              <select
                id="quick-edit-category-status"
                className="admin-input"
                value={isActive ? "active" : "inactive"}
                disabled={pending}
                onChange={(event) => setIsActive(event.target.value === "active")}
              >
                <option value="active">Đang hoạt động</option>
                <option value="inactive">Tạm ẩn</option>
              </select>
            </div>

            <div className="admin-field">
              <label className="admin-label" htmlFor="quick-edit-category-sort">
                Thứ tự hiển thị
              </label>
              <input
                id="quick-edit-category-sort"
                className="admin-input"
                type="number"
                value={sortOrder}
                disabled={pending}
                onChange={(event) => setSortOrder(event.target.value)}
              />
            </div>

            <div className="admin-field admin-quick-create-grid__full">
              <label className="admin-label" htmlFor="quick-edit-category-parent">
                Danh mục cha
              </label>
              <select
                id="quick-edit-category-parent"
                className="admin-input"
                value={parentId}
                disabled={pending}
                onChange={(event) => {
                  setParentId(event.target.value);
                  if (fieldErrors.parentId) {
                    setFieldErrors((current) => {
                      const next = { ...current };
                      delete next.parentId;
                      return next;
                    });
                  }
                }}
              >
                <option value="">— Không có danh mục cha —</option>
                {parentOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
              {fieldErrors.parentId && (
                <p className="admin-field-error">{fieldErrors.parentId}</p>
              )}
            </div>
          </div>
        </form>
      </div>
    </AdminQuickCreateShell>
  );
}
