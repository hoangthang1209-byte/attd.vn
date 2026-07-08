"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import MediaPicker from "@/components/admin/media/MediaPicker";
import ProductCategoryCascadingPicker from "@/components/admin/products/ProductCategoryCascadingPicker";
import AdminSearchableSelect from "@/components/admin/AdminSearchableSelect";
import { useAdminMutation } from "@/hooks/useAdminAction";
import { adminApiFetch, parseAdminJsonResponse } from "@/lib/admin/adminMutation";
import { toSlug } from "@/lib/slug";
import {
  PRODUCT_ENTRY_MODES,
  PRODUCT_MODE_HELPER,
  PRODUCT_TEMPLATE_HELPER,
  PRODUCT_PRICING_MODE_LABELS,
  PRODUCT_STOCK_MODE_LABELS,
  getProductModeConfig,
  getProductTemplateConfig,
  listProductTemplatesForMode,
  resolveRecommendedCategoryIds,
  type ProductEntryMode,
  type ProductPricingMode,
  type ProductStockMode,
} from "@/features/products/product-entry-modes";
import {
  buildFastCreateDraftPayload,
  canGenerateSkuMatrix,
  resolveFastCreateWarnings,
  validateFastCreateDraft,
  PRICING_CLARITY_HELPER,
  FAST_CREATE_ROUTES,
  previewVariantMatrixCount,
  parseAxisValuesInput,
  type FastCreateDraftInput,
} from "@/features/products/product-fast-create";
import {
  buildProductMetaDescriptionFallback,
  buildProductSeoTitleFallback,
  buildProductImageAltFallback,
  SEO_FALLBACK_HELPER,
} from "@/features/products/product-seo-fallback";

export type FastCreateCategory = {
  id: string;
  name: string;
  nameEn?: string | null;
  slug: string;
  skuCode?: string | null;
  parentId?: string | null;
  isActive?: boolean;
  isPublic?: boolean;
};

type Props = {
  categories: FastCreateCategory[];
};

type WizardStep = "mode" | "template" | "form";

export default function ProductFastCreateWizard({ categories }: Props) {
  const router = useRouter();
  const mutate = useAdminMutation();

  const [step, setStep] = useState<WizardStep>("mode");
  const [mode, setMode] = useState<ProductEntryMode | "">("");
  const [templateKey, setTemplateKey] = useState("");

  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [featuredImage, setFeaturedImage] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [defaultMoq, setDefaultMoq] = useState("");
  const [leadTime, setLeadTime] = useState("");
  const [stockMode, setStockMode] = useState<ProductStockMode | "">("");
  const [pricingMode, setPricingMode] = useState<ProductPricingMode | "">("");
  const [internalNote, setInternalNote] = useState("");
  const [useVariants, setUseVariants] = useState(true);
  const [axisValues, setAxisValues] = useState<Record<string, string>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const modeConfig = getProductModeConfig(mode || null);
  const templateConfig = getProductTemplateConfig(templateKey || null);
  const templates = useMemo(() => listProductTemplatesForMode(mode || null), [mode]);
  const selectedCategory = categories.find((c) => c.id === categoryId) ?? null;
  const warnings = resolveFastCreateWarnings(selectedCategory);
  const skuMatrixAllowed = canGenerateSkuMatrix(selectedCategory);
  const isNoVariantTemplate = templateConfig ? templateConfig.variantAxes.length === 0 : false;

  const recommendedCategories = useMemo(() => {
    const ids = resolveRecommendedCategoryIds(templateKey || null, categories);
    return ids
      .map((id) => categories.find((c) => c.id === id))
      .filter((c): c is FastCreateCategory => Boolean(c));
  }, [templateKey, categories]);

  const seoPreview = useMemo(() => {
    if (!name.trim()) return null;
    const categoryName = categories.find((c) => c.id === categoryId)?.name ?? null;
    const seoInput = {
      name,
      categoryName,
      productMode: mode || null,
      defaultMoq: defaultMoq ? Number(defaultMoq) : null,
      leadTime: leadTime || null,
    };
    return {
      slug: toSlug(name),
      seoTitle: buildProductSeoTitleFallback(seoInput),
      seoDescription: buildProductMetaDescriptionFallback(seoInput),
      imageAlt: buildProductImageAltFallback(seoInput),
    };
  }, [name, categories, categoryId, mode, defaultMoq, leadTime]);

  const matrixPreviewCount = useMemo(() => {
    if (!templateConfig || !useVariants || isNoVariantTemplate) return 0;
    const lists = templateConfig.variantAxes.map((axis) =>
      parseAxisValuesInput(axisValues[axis.kind] ?? ""),
    );
    return previewVariantMatrixCount(lists);
  }, [templateConfig, useVariants, isNoVariantTemplate, axisValues]);

  function selectMode(next: ProductEntryMode) {
    setMode(next);
    const config = getProductModeConfig(next);
    if (config) {
      setStockMode((prev) => prev || config.defaultStockMode);
      setPricingMode((prev) => prev || config.defaultPricingMode);
    }
    setTemplateKey("");
    setStep("template");
  }

  function selectTemplate(next: string) {
    setTemplateKey(next);
    const config = getProductTemplateConfig(next);
    if (config) {
      setDefaultMoq((prev) => prev || (config.defaultMoq ? String(config.defaultMoq) : ""));
      setLeadTime((prev) => prev || config.defaultLeadTime);
      setStockMode((prev) => prev || config.defaultStockMode);
      setUseVariants(config.variantAxes.length > 0);
      setAxisValues((prev) => {
        const nextAxes = { ...prev };
        for (const axis of config.variantAxes) {
          if (nextAxes[axis.kind] === undefined) {
            nextAxes[axis.kind] = axis.sampleValues.join(", ");
          }
        }
        return nextAxes;
      });
    }
    setStep("form");
  }

  function buildInput(): FastCreateDraftInput {
    return {
      name,
      categoryId,
      categoryName: selectedCategory?.name ?? null,
      productMode: mode || null,
      productTemplateKey: templateKey || null,
      shortDescription,
      featuredImage,
      defaultMoq: defaultMoq ? Number(defaultMoq) : null,
      leadTime: leadTime || null,
      stockMode: stockMode || null,
      pricingMode: pricingMode || null,
      internalNote: internalNote || null,
      supportsPrinting: templateConfig?.supportsPrinting,
      supportsEmbroidery: templateConfig?.supportsEmbroidery,
      supportsOem: templateConfig?.supportsOem,
    };
  }

  function buildVariantOptionsPayload() {
    if (!templateConfig || !useVariants || isNoVariantTemplate) return [];
    return templateConfig.variantAxes
      .map((axis, index) => {
        const values = parseAxisValuesInput(axisValues[axis.kind] ?? "");
        return {
          name: axis.label,
          slug: toSlug(axis.label) || axis.kind.toLowerCase(),
          sortOrder: index,
          values: values.map((label, valueIndex) => ({ label, sortOrder: valueIndex })),
        };
      })
      .filter((option) => option.values.length > 0);
  }

  async function saveDraft(withVariants: boolean) {
    if (withVariants && !skuMatrixAllowed) return;
    const validation = validateFastCreateDraft(buildInput());
    if (!validation.valid) {
      setFieldErrors(validation.fieldErrors);
      if (validation.fieldErrors.productMode) setStep("mode");
      else if (validation.fieldErrors.productTemplateKey) setStep("template");
      else setStep("form");
      return;
    }
    setFieldErrors({});
    const payload: Record<string, unknown> = { ...buildFastCreateDraftPayload(buildInput()) };
    if (withVariants) {
      const options = buildVariantOptionsPayload();
      if (options.length > 0) payload.options = options;
    }

    setSaving(true);
    const saved = await mutate<{ id: string }>({
      loadingMessage: "Đang lưu nháp sản phẩm…",
      successMessage: withVariants
        ? "Đã lưu nháp. Tiếp tục thiết lập biến thể."
        : "Đã lưu nháp sản phẩm.",
      errorFallback: "Không thể lưu nháp sản phẩm.",
      action: async () => {
        const res = await adminApiFetch("/api/admin/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        return parseAdminJsonResponse(res, (body) => ({ id: String(body.id ?? "") }));
      },
    });
    setSaving(false);
    if (saved?.id) {
      const suffix = withVariants ? "?tab=variants&generateVariants=1" : "";
      router.push(`/admin/products/${saved.id}/edit${suffix}`);
    }
  }

  return (
    <div className="admin-fast-create">
      <p className="admin-field-hint">
        Cần form đầy đủ? Dùng{" "}
        <Link href={FAST_CREATE_ROUTES.advanced} className="admin-link">
          Tạo nâng cao
        </Link>
        .
      </p>

      <section className="admin-card admin-fast-create__section">
        <h2 className="admin-subtitle">Chọn loại sản phẩm</h2>
        <p className="admin-field-hint">{PRODUCT_MODE_HELPER}</p>
        <div className="admin-fast-create__mode-grid">
          {PRODUCT_ENTRY_MODES.map((option) => (
            <button
              key={option.key}
              type="button"
              className={`admin-fast-create__mode-card${mode === option.key ? " admin-fast-create__mode-card--active" : ""}`}
              onClick={() => selectMode(option.key)}
            >
              <span className="admin-fast-create__mode-name">{option.name}</span>
              <span className="admin-fast-create__mode-desc">{option.description}</span>
            </button>
          ))}
        </div>
        {fieldErrors.productMode && <p className="admin-field-error" role="alert">{fieldErrors.productMode}</p>}
      </section>

      {mode && step !== "mode" && (
        <section className="admin-card admin-fast-create__section">
          <h2 className="admin-subtitle">Chọn mẫu sản phẩm</h2>
          <p className="admin-field-hint">{PRODUCT_TEMPLATE_HELPER}</p>
          <div className="admin-fast-create__template-grid">
            {templates.map((template) => (
              <button
                key={template.key}
                type="button"
                className={`admin-fast-create__template-card${templateKey === template.key ? " admin-fast-create__template-card--active" : ""}`}
                onClick={() => selectTemplate(template.key)}
              >
                <span className="admin-fast-create__template-name">{template.name}</span>
                <span className="admin-fast-create__template-axes">
                  {template.variantAxes.length > 0
                    ? template.variantAxes.map((a) => a.label).join(" + ")
                    : "Không biến thể"}
                </span>
              </button>
            ))}
          </div>
          {fieldErrors.productTemplateKey && (
            <p className="admin-field-error" role="alert">{fieldErrors.productTemplateKey}</p>
          )}
        </section>
      )}

      {templateKey && step === "form" && (
        <section className="admin-card admin-fast-create__section">
          <h2 className="admin-subtitle">Thông tin nhanh</h2>
          <p className="admin-field-hint">{modeConfig?.name} · {templateConfig?.name}</p>

          <div className="admin-field">
            <label className="admin-label" htmlFor="fast-create-name">
              Tên sản phẩm <span className="admin-required">*</span>
            </label>
            <input id="fast-create-name" className="admin-input" value={name} onChange={(e) => setName(e.target.value)} />
            {fieldErrors.name && <p className="admin-field-error" role="alert">{fieldErrors.name}</p>}
          </div>

          <ProductCategoryCascadingPicker
            categories={categories}
            value={categoryId}
            onChange={setCategoryId}
            error={fieldErrors.categoryId}
            onClearError={() => setFieldErrors((prev) => ({ ...prev, categoryId: "" }))}
          />
          {recommendedCategories.length > 0 && (
            <div className="admin-fast-create__recommend">
              <span className="admin-field-hint">Danh mục đề xuất:</span>
              {recommendedCategories.map((category) => (
                <button key={category.id} type="button" className="admin-chip" onClick={() => setCategoryId(category.id)}>
                  {category.name}
                </button>
              ))}
            </div>
          )}
          {warnings.map((warning) => (
            <p key={warning} className="admin-field-hint admin-field-hint--warning">{warning}</p>
          ))}

          <div className="admin-field">
            <MediaPicker label="Ảnh chính" value={featuredImage} onChange={setFeaturedImage} folder="products" />
          </div>

          <div className="admin-field">
            <label className="admin-label" htmlFor="fast-create-short">Mô tả ngắn</label>
            <textarea id="fast-create-short" className="admin-input" rows={2} value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} />
          </div>

          <div className="admin-fast-create__row">
            <div className="admin-field">
              <label className="admin-label" htmlFor="fast-create-moq">MOQ</label>
              <input id="fast-create-moq" className="admin-input" inputMode="numeric" value={defaultMoq} onChange={(e) => setDefaultMoq(e.target.value.replace(/[^\d]/g, ""))} />
            </div>
            <div className="admin-field">
              <label className="admin-label" htmlFor="fast-create-lead">Thời gian sản xuất</label>
              <input id="fast-create-lead" className="admin-input" value={leadTime} onChange={(e) => setLeadTime(e.target.value)} placeholder="VD: 7-10 ngày" />
            </div>
          </div>

          <div className="admin-fast-create__row">
            <div className="admin-field">
              <label className="admin-label" htmlFor="fast-create-stock">Trạng thái tồn kho</label>
              <AdminSearchableSelect
                id="fast-create-stock"
                value={stockMode}
                onChange={(value) => setStockMode(value as ProductStockMode)}
                options={Object.entries(PRODUCT_STOCK_MODE_LABELS).map(([value, label]) => ({ value, label }))}
                placeholder="Chọn trạng thái tồn kho"
              />
            </div>
            <div className="admin-field">
              <label className="admin-label" htmlFor="fast-create-pricing">Hình thức giá</label>
              <AdminSearchableSelect
                id="fast-create-pricing"
                value={pricingMode}
                onChange={(value) => setPricingMode(value as ProductPricingMode)}
                options={(modeConfig?.pricingModes ?? []).map((value) => ({
                  value,
                  label: PRODUCT_PRICING_MODE_LABELS[value],
                }))}
                placeholder="Chọn hình thức giá"
              />
            </div>
          </div>
          <p className="admin-field-hint">{PRICING_CLARITY_HELPER}</p>

          <div className="admin-field">
            <label className="admin-label" htmlFor="fast-create-note">Ghi chú nội bộ</label>
            <textarea id="fast-create-note" className="admin-input" rows={2} value={internalNote} onChange={(e) => setInternalNote(e.target.value)} />
          </div>

          {!isNoVariantTemplate && (
            <div className="admin-fast-create__variants">
              <div className="admin-fast-create__variants-header">
                <h3 className="admin-subtitle">Thiết lập biến thể nhanh</h3>
                <label className="admin-checkbox">
                  <input type="checkbox" checked={!useVariants} onChange={(e) => setUseVariants(!e.target.checked)} />
                  Không dùng biến thể
                </label>
              </div>
              {useVariants && templateConfig && (
                <>
                  {templateConfig.variantAxes.map((axis) => (
                    <div className="admin-field" key={axis.kind}>
                      <label className="admin-label">{axis.label} (Dùng mẫu đề xuất)</label>
                      <input
                        className="admin-input"
                        value={axisValues[axis.kind] ?? ""}
                        onChange={(e) => setAxisValues((prev) => ({ ...prev, [axis.kind]: e.target.value }))}
                        placeholder={axis.sampleValues.join(", ")}
                      />
                    </div>
                  ))}
                  {matrixPreviewCount > 0 && (
                    <p className="admin-field-hint">
                      Xem trước biến thể: {matrixPreviewCount} tổ hợp. Biến thể sẽ được tạo ở bước tiếp theo.
                    </p>
                  )}
                  {!skuMatrixAllowed && (
                    <p className="admin-field-hint admin-field-hint--warning">
                      Không thể tạo biến thể tự động vì danh mục thiếu mã. Hãy bổ sung mã danh mục hoặc chỉ lưu nháp.
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {seoPreview && (
            <div className="admin-fast-create__seo">
              <h3 className="admin-subtitle">SEO tự tạo</h3>
              <p className="admin-field-hint">{SEO_FALLBACK_HELPER}</p>
              <p className="admin-field-hint"><strong>Slug:</strong> {seoPreview.slug}</p>
              <p className="admin-field-hint"><strong>Tiêu đề SEO:</strong> {seoPreview.seoTitle}</p>
              <p className="admin-field-hint"><strong>Mô tả SEO:</strong> {seoPreview.seoDescription}</p>
              <p className="admin-field-hint"><strong>Alt ảnh:</strong> {seoPreview.imageAlt}</p>
            </div>
          )}

          <div className="admin-fast-create__actions">
            <button type="button" className="admin-button admin-button--primary" disabled={saving} onClick={() => void saveDraft(false)}>
              Lưu nháp
            </button>
            {!isNoVariantTemplate && (
              <button
                type="button"
                className="admin-button"
                disabled={saving || !skuMatrixAllowed}
                onClick={() => void saveDraft(true)}
              >
                Lưu nháp &amp; thêm biến thể
              </button>
            )}
            <button type="button" className="admin-button admin-button--ghost" disabled={saving} onClick={() => router.push("/admin/products")}>
              Hủy
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
