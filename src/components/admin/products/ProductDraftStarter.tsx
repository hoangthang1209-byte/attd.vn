"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ProductCategoryCascadingPicker from "@/components/admin/products/ProductCategoryCascadingPicker";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";
import { useAdminMutation } from "@/hooks/useAdminAction";
import { adminApiFetch, parseAdminJsonResponse } from "@/lib/admin/adminMutation";
import {
  PRODUCT_ENTRY_MODES,
  PRODUCT_MODE_HELPER,
  PRODUCT_TEMPLATE_HELPER,
  getProductModeConfig,
  listProductTemplatesForMode,
  type ProductEntryMode,
} from "@/features/products/product-entry-modes";
import { FAST_CREATE_ROUTES } from "@/features/products/product-fast-create";
import {
  buildDraftStarterPayload,
  validateDraftStarter,
} from "@/features/products/product-draft-starter";

export type DraftStarterCategory = {
  id: string;
  name: string;
  nameEn?: string | null;
  slug: string;
  skuCode?: string | null;
  parentId?: string | null;
  isActive?: boolean;
};

type Props = {
  categories: DraftStarterCategory[];
};

export default function ProductDraftStarter({ categories }: Props) {
  const router = useRouter();
  const mutate = useAdminMutation();

  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [productMode, setProductMode] = useState<ProductEntryMode | "">("");
  const [productTemplateKey, setProductTemplateKey] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const templates = useMemo(() => listProductTemplatesForMode(productMode || null), [productMode]);
  const modeConfig = getProductModeConfig(productMode || null);
  const selectedCategory = categories.find((category) => category.id === categoryId) ?? null;

  async function createDraft() {
    const input = {
      name,
      categoryId,
      categoryName: selectedCategory?.name ?? null,
      productMode: productMode || null,
      productTemplateKey: productTemplateKey || null,
    };
    const validation = validateDraftStarter(input);
    if (!validation.valid) {
      setFieldErrors(validation.fieldErrors);
      return;
    }
    setFieldErrors({});
    setSaving(true);
    const saved = await mutate<{ id: string }>({
      loadingMessage: "Đang tạo nháp sản phẩm…",
      successMessage: "Đã tạo nháp. Tiếp tục chỉnh sửa trong form đầy đủ.",
      errorFallback: "Không thể tạo nháp sản phẩm.",
      action: async () => {
        const res = await adminApiFetch("/api/admin/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildDraftStarterPayload(input)),
        });
        return parseAdminJsonResponse(res, (body) => ({ id: String(body.id ?? "") }));
      },
    });
    setSaving(false);
    if (saved?.id) {
      router.push(`/admin/products/${saved.id}/edit`);
    }
  }

  return (
    <div className="admin-draft-starter" data-testid="product-draft-starter">
      <p className="admin-field-hint">
        Tạo nháp nhanh rồi chuyển sang form chỉnh sửa đầy đủ (bảng size, gợi ý nội dung, biến thể). Cần tạo
        nhanh có mẫu? Dùng{" "}
        <Link href={FAST_CREATE_ROUTES.fast} className="admin-link">
          Tạo nhanh sản phẩm
        </Link>
        .
      </p>

      <section className="admin-card admin-draft-starter__card">
        <h2 className="admin-subtitle">Thông tin bắt đầu</h2>

        <div className="admin-field" data-field="name">
          <label className="admin-label" htmlFor="draft-starter-name">
            Tên sản phẩm <span className="admin-required">*</span>
          </label>
          <input
            id="draft-starter-name"
            className="admin-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Áo thun regular attd 001"
            data-testid="draft-starter-name"
          />
          {fieldErrors.name && (
            <p className="admin-field-error" role="alert">
              {fieldErrors.name}
            </p>
          )}
        </div>

        <ProductCategoryCascadingPicker
          categories={categories}
          value={categoryId}
          onChange={setCategoryId}
          error={fieldErrors.categoryId}
          onClearError={() => setFieldErrors((prev) => ({ ...prev, categoryId: "" }))}
        />

        <div className="admin-field">
          <label className="admin-label">Loại sản phẩm (tuỳ chọn)</label>
          <p className="admin-field-hint">{PRODUCT_MODE_HELPER}</p>
          <div className="admin-draft-starter__mode-grid">
            {PRODUCT_ENTRY_MODES.map((option) => (
              <button
                key={option.key}
                type="button"
                className={`admin-draft-starter__mode-card${
                  productMode === option.key ? " admin-draft-starter__mode-card--active" : ""
                }`}
                onClick={() => {
                  setProductMode(option.key);
                  setProductTemplateKey("");
                }}
              >
                <span className="admin-draft-starter__mode-name">{option.name}</span>
                <span className="admin-draft-starter__mode-desc">{option.description}</span>
              </button>
            ))}
          </div>
          {fieldErrors.productMode && (
            <p className="admin-field-error" role="alert">
              {fieldErrors.productMode}
            </p>
          )}
        </div>

        {productMode && (
          <div className="admin-field">
            <label className="admin-label">Mẫu sản phẩm (tuỳ chọn)</label>
            <p className="admin-field-hint">
              {PRODUCT_TEMPLATE_HELPER}
              {modeConfig ? ` · ${modeConfig.name}` : ""}
            </p>
            <div className="admin-draft-starter__template-grid">
              {templates.map((template) => (
                <button
                  key={template.key}
                  type="button"
                  className={`admin-draft-starter__template-card${
                    productTemplateKey === template.key
                      ? " admin-draft-starter__template-card--active"
                      : ""
                  }`}
                  onClick={() => setProductTemplateKey(template.key)}
                >
                  <span className="admin-draft-starter__template-name">{template.name}</span>
                </button>
              ))}
            </div>
            {fieldErrors.productTemplateKey && (
              <p className="admin-field-error" role="alert">
                {fieldErrors.productTemplateKey}
              </p>
            )}
          </div>
        )}

        <div className="admin-draft-starter__actions">
          <AdminLoadingButton
            type="button"
            variant="primary"
            pending={saving}
            pendingLabel="Đang tạo nháp..."
            onClick={() => void createDraft()}
            data-testid="draft-starter-submit"
          >
            Tạo nháp và tiếp tục
          </AdminLoadingButton>
          <button
            type="button"
            className="admin-btn admin-btn--secondary"
            disabled={saving}
            onClick={() => router.push("/admin/products")}
          >
            Hủy
          </button>
        </div>
      </section>
    </div>
  );
}
