"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import MediaPicker from "@/components/admin/media/MediaPicker";
import PublishQualityChecklist from "@/components/admin/products/PublishQualityChecklist";
import ProductB2BSharedAttributeField from "@/components/admin/products/ProductB2BSharedAttributeField";
import ProductMaterialSection from "@/components/admin/products/ProductMaterialSection";
import ProductCatalogSpecificationsSection, {
  type ProductSpecificationFormRow,
} from "@/components/admin/products/ProductCatalogSpecificationsSection";
import ProductCatalogContentSection, {
  type ProductCustomizationFormRow,
} from "@/components/admin/products/ProductCatalogContentSection";
import ProductCatalogVariantsSection from "@/components/admin/products/ProductCatalogVariantsSection";
import ProductInformationAttributesSection from "@/components/admin/products/ProductInformationAttributesSection";
import type { SharedAttributePickerOption } from "@/components/admin/products/ProductOptionGroupBuilder";
import {
  mapOptionsToFormRows,
  mapVariantsToFormRows,
  type MatrixVariantFormRow,
  type ProductAttributeAssignmentFormRow,
} from "@/features/products/product-catalog-form-mappers";
import ProductExportDialog from "@/components/admin/products/ProductExportDialog";
import type { OptionGroupFormRow } from "@/components/admin/products/ProductOptionGroupBuilder";
import {
  resolveOptionValueRefFromGroups,
} from "@/features/products/product-variant-matrix.utils";
import {
  fieldErrorInputClass,
  resolveTabForField,
  scrollToFirstFieldError,
  validateProductCatalogFormLocal,
} from "@/features/products/product-catalog-form-validation";
import { useAdminMutation } from "@/hooks/useAdminAction";
import {
  SEO_PUBLISH_QUALITY_GATE_FAILED,
  SEO_PUBLISH_QUALITY_SUMMARY,
  buildProductPublishChecklist,
  type ProductPublishQualityInput,
} from "@/lib/seo/publish-quality-gate";

type Category = { id: string; name: string; slug: string; skuCode: string | null };

type ProductFormData = {
  id?: string;
  slug?: string;
  name: string;
  productCode: string;
  categoryId: string;
  shortDescription: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  material: string;
  form: string;
  fit: string;
  defaultMoq: string;
  leadTime: string;
  useCases: string;
  targetCustomers: string;
  supportsPrinting: boolean;
  supportsEmbroidery: boolean;
  supportsOem: boolean;
  tags: string;
  status: string;
  featuredImage: string;
  gallery: string[];
  specifications: ProductSpecificationFormRow[];
  attributeAssignments: ProductAttributeAssignmentFormRow[];
  customizations: ProductCustomizationFormRow[];
  options: OptionGroupFormRow[];
  variants: MatrixVariantFormRow[];
};

const FORM_TABS = [
  { id: "basic", label: "Thông tin cơ bản" },
  { id: "media", label: "Hình ảnh & media" },
  { id: "variants", label: "Thuộc tính & biến thể" },
  { id: "content", label: "Mô tả & thông số" },
  { id: "seo", label: "SEO & hiển thị" },
] as const;

type FormTabId = (typeof FORM_TABS)[number]["id"];

type Props = {
  initialData?: Partial<ProductFormData> & { id?: string; slug?: string };
  categories?: Category[];
  preselectAttributeId?: string;
  preselectUsage?: string;
};

const LEAD_TIME_PRESETS = [
  "Có sẵn: 1–3 ngày",
  "Đặt hàng: 5–10 ngày",
  "OEM: 10–20 ngày tùy số lượng",
  "Thỏa thuận theo đơn hàng",
];

export default function ProductCatalogForm({
  initialData,
  categories: propCategories,
  preselectAttributeId,
  preselectUsage,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mutate = useAdminMutation();
  const [categories, setCategories] = useState<Category[]>(propCategories ?? []);
  const [sharedAttributes, setSharedAttributes] = useState<SharedAttributePickerOption[]>([]);
  const [sharedAttributesLoading, setSharedAttributesLoading] = useState(false);
  const [sharedAttributesError, setSharedAttributesError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FormTabId>("basic");
  const [form, setForm] = useState<ProductFormData>({
    id: initialData?.id,
    slug: initialData?.slug,
    name: initialData?.name ?? "",
    productCode: initialData?.productCode ?? "",
    categoryId: initialData?.categoryId ?? "",
    shortDescription: initialData?.shortDescription ?? "",
    description: initialData?.description ?? "",
    seoTitle: initialData?.seoTitle ?? "",
    seoDescription: initialData?.seoDescription ?? "",
    material: initialData?.material ?? "",
    form: initialData?.form ?? "",
    fit: initialData?.fit ?? "",
    defaultMoq: initialData?.defaultMoq ?? "",
    leadTime: initialData?.leadTime ?? "",
    useCases: initialData?.useCases ?? "",
    targetCustomers: initialData?.targetCustomers ?? "",
    supportsPrinting: initialData?.supportsPrinting ?? false,
    supportsEmbroidery: initialData?.supportsEmbroidery ?? false,
    supportsOem: initialData?.supportsOem ?? true,
    tags: initialData?.tags ?? "",
    status: initialData?.status ?? "DRAFT",
    featuredImage: initialData?.featuredImage ?? "",
    gallery: initialData?.gallery ?? [],
    specifications: initialData?.specifications ?? [],
    attributeAssignments: initialData?.attributeAssignments ?? [],
    customizations: initialData?.customizations ?? [],
    options: initialData?.options ?? [],
    variants: initialData?.variants ?? [],
  });
  const [saving, setSaving] = useState(false);
  const [bulkOpInProgress, setBulkOpInProgress] = useState(false);
  const [exportDialog, setExportDialog] = useState<"export" | "clone" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [productCodePreview, setProductCodePreview] = useState<string | null>(
    initialData?.productCode ?? null
  );
  const [categorySkuCode, setCategorySkuCode] = useState<string | null>(null);
  const [productCodePreviewError, setProductCodePreviewError] = useState<string | null>(null);
  const [allowManualProductCode, setAllowManualProductCode] = useState(false);
  const deletedVariantIdsRef = useRef<Set<string>>(new Set());
  const attributeSectionRef = useRef<HTMLElement | null>(null);
  const preselectHandledRef = useRef(false);
  const [initialStatus] = useState(() => initialData?.status ?? "DRAFT");
  const [initialLegacyFit] = useState(() => initialData?.fit?.trim() ?? "");
  const [legacyFitClearPending, setLegacyFitClearPending] = useState(false);

  const productPublishQualityInput = useMemo((): ProductPublishQualityInput => ({
    name: form.name,
    slug: form.slug,
    categoryId: form.categoryId,
    description: form.description,
    seoTitle: form.seoTitle,
    seoDescription: form.seoDescription,
    featuredImage: form.featuredImage,
    gallery: form.gallery,
    variants: form.variants.map((variant) => ({
      variantStatus: variant.variantStatus,
      imageUrl: variant.imageUrl,
    })),
    specifications: form.specifications,
    attributeAssignments: form.attributeAssignments,
    options: form.options,
  }), [form]);

  const productPublishChecklist = useMemo(
    () => buildProductPublishChecklist(productPublishQualityInput),
    [productPublishQualityInput],
  );

  const showProductPublishChecklist = form.status === "ACTIVE";
  const showProductLegacySeoWarning =
    Boolean(form.id) &&
    initialStatus === "ACTIVE" &&
    form.status === "ACTIVE" &&
    productPublishChecklist.some((item) => !item.complete);

  const loadSharedAttributes = useCallback(async () => {
    setSharedAttributesLoading(true);
    setSharedAttributesError(null);
    try {
      const res = await fetch("/api/admin/attributes?activeOnly=1");
      const items = await res.json() as SharedAttributePickerOption[];
      setSharedAttributes(Array.isArray(items) ? items : []);
    } catch {
      setSharedAttributes([]);
      setSharedAttributesError("Không thể tải thuộc tính dùng chung.");
    }
    setSharedAttributesLoading(false);
  }, []);

  useEffect(() => {
    if (!propCategories) {
      void fetch("/api/admin/products/categories")
        .then((r) => r.json())
        .then((cats: Category[]) => setCategories(cats));
    }
    const timer = window.setTimeout(() => {
      void loadSharedAttributes();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [propCategories, loadSharedAttributes]);

  useEffect(() => {
    if (preselectHandledRef.current) return;
    const attributeId =
      preselectAttributeId ?? searchParams.get("attributeId") ?? undefined;
    const usage = preselectUsage ?? searchParams.get("usage") ?? undefined;
    if (!attributeId || usage !== "specification") return;
    if (sharedAttributesLoading) return;

    const attribute = sharedAttributes.find((item) => item.id === attributeId);
    if (!attribute?.isSpecificationAttribute) return;

    preselectHandledRef.current = true;
    const timer = window.setTimeout(() => {
      setActiveTab("content");
      setForm((prev) => {
        if (prev.attributeAssignments.some((row) => row.attributeId === attributeId)) {
          return prev;
        }
        return {
          ...prev,
          attributeAssignments: [
            ...prev.attributeAssignments,
            {
              clientKey: `assign-preselect-${attributeId}`,
              attributeId,
              useCustomValue: false,
              sortOrder: prev.attributeAssignments.length,
            },
          ],
        };
      });
      requestAnimationFrame(() => {
        attributeSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [
    preselectAttributeId,
    preselectUsage,
    searchParams,
    sharedAttributes,
    sharedAttributesLoading,
  ]);

  useEffect(() => {
    if (form.id || !form.categoryId) {
      if (!form.id) {
        const timer = window.setTimeout(() => {
          setProductCodePreview(null);
          setCategorySkuCode(null);
          setProductCodePreviewError(null);
        }, 0);
        return () => window.clearTimeout(timer);
      }
      return;
    }

    let cancelled = false;
    void fetch("/api/admin/products/sku-preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId: form.categoryId }),
    })
      .then(async (res) => {
        const data = await res.json() as {
          productCodePreview?: string | null;
          categorySkuCode?: string | null;
          message?: string;
        };
        if (cancelled) return;
        if (!res.ok) {
          setProductCodePreview(null);
          setCategorySkuCode(data.categorySkuCode ?? null);
          setProductCodePreviewError(data.message ?? "Không thể xem ID dự kiến.");
          return;
        }
        setProductCodePreview(data.productCodePreview ?? null);
        setCategorySkuCode(data.categorySkuCode ?? null);
        setProductCodePreviewError(null);
      })
      .catch(() => {
        if (!cancelled) setProductCodePreviewError("Không thể xem ID dự kiến.");
      });

    return () => {
      cancelled = true;
    };
  }, [form.categoryId, form.id]);

  function setField<K extends keyof ProductFormData>(key: K, value: ProductFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function reloadProductFromServer() {
    if (!form.id) return;
    try {
      const res = await fetch(`/api/admin/products/${form.id}`);
      if (!res.ok) return;
      const product = (await res.json()) as {
        options: Parameters<typeof mapOptionsToFormRows>[0];
        variants: Parameters<typeof mapVariantsToFormRows>[0];
      };
      setForm((prev) => ({
        ...prev,
        options: mapOptionsToFormRows(product.options ?? []),
        variants: mapVariantsToFormRows(product.variants ?? []).filter(
          (variant) => !variant.id || !deletedVariantIdsRef.current.has(variant.id),
        ),
      }));
    } catch {
      /* ignore */
    }
  }

  function handleVariantDeleted(variantId: string) {
    deletedVariantIdsRef.current.add(variantId);
  }

  function moveGallery(idx: number, dir: -1 | 1) {
    const arr = [...form.gallery];
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= arr.length) return;
    [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
    setField("gallery", arr);
  }

  function applyValidationErrors(errors: Record<string, string>, summaryMessage: string) {
    setFieldErrors(errors);
    const firstField = Object.keys(errors)[0];
    if (firstField) setActiveTab(resolveTabForField(firstField));
    setError(summaryMessage);
    requestAnimationFrame(() => scrollToFirstFieldError(errors));
  }

  function parseNumberField(value: string): number | undefined {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const n = parseFloat(trimmed.replace(/[,\s]/g, ""));
    return Number.isFinite(n) ? n : undefined;
  }

  function buildPayload() {
    return {
      name: form.name.trim(),
      ...(form.slug !== undefined ? { slug: form.slug.trim() || undefined } : {}),
      ...(form.id && allowManualProductCode
        ? { productCode: form.productCode.trim() || undefined }
        : form.id
          ? {}
          : {}),
      categoryId: form.categoryId,
      shortDescription: form.shortDescription.trim() || undefined,
      description: form.description.trim() || undefined,
      seoTitle: form.seoTitle.trim() || undefined,
      seoDescription: form.seoDescription.trim() || undefined,
      ...(legacyFitClearPending
        ? { fit: null }
        : initialLegacyFit
          ? { fit: initialLegacyFit }
          : {}),
      defaultMoq: form.defaultMoq.trim() ? parseNumberField(form.defaultMoq) : undefined,
      leadTime: form.leadTime.trim() || undefined,
      useCases: form.useCases.split(",").map((s) => s.trim()).filter(Boolean),
      targetCustomers: form.targetCustomers.split(",").map((s) => s.trim()).filter(Boolean),
      supportsPrinting: form.supportsPrinting,
      supportsEmbroidery: form.supportsEmbroidery,
      supportsOem: form.supportsOem,
      tags: form.tags.split(",").map((s) => s.trim()).filter(Boolean),
      status: form.status,
      featuredImage: form.featuredImage.trim() || undefined,
      gallery: form.gallery.map((url) => url.trim()).filter(Boolean),
      specifications: form.specifications
        .filter((row) => row.label.trim() && row.value.trim())
        .map((row, index) => ({
          id: row.id,
          label: row.label.trim(),
          value: row.value.trim(),
          sortOrder: row.sortOrder ?? index,
        })),
      customizations: form.customizations
        .filter((row) => row.label.trim())
        .map((row, index) => ({
          id: row.id,
          label: row.label.trim(),
          description: row.description?.trim() || undefined,
          sortOrder: row.sortOrder ?? index,
          enabled: row.enabled !== false,
        })),
      attributeAssignments: form.attributeAssignments.map((row, index) => ({
        id: row.id,
        attributeId: row.attributeId,
        attributeValueId: row.useCustomValue ? null : row.attributeValueId || null,
        customValue: row.useCustomValue ? row.customValue?.trim() || null : null,
        sortOrder: row.sortOrder ?? index,
      })),
      options: form.options
        .filter((group) => group.name.trim())
        .map((group, index) => ({
          id: group.id,
          attributeId: group.attributeId,
          name: group.name.trim(),
          slug: group.slug.trim() || undefined,
          sortOrder: group.sortOrder ?? index,
          values: group.values
            .filter((value) => value.label.trim())
            .map((value, valueIndex) => ({
              id: value.id,
              attributeValueId: value.attributeValueId,
              label: value.label.trim(),
              valueCode: value.valueCode.trim() || undefined,
              imageUrl: value.imageUrl.trim() || undefined,
              sortOrder: value.sortOrder ?? valueIndex,
            })),
        })),
      variants: form.variants.map((v) => ({
        id: v.id,
        clientKey: v.clientKey,
        sku: v.sku.trim() || undefined,
        colorName: v.colorName.trim() || undefined,
        colorCode: v.colorCode.trim() || undefined,
        sizeName: v.sizeName.trim() || undefined,
        dimensions: v.dimensions.trim() || undefined,
        capacity: v.capacity.trim() || undefined,
        displayLabel: v.displayLabel.trim() || undefined,
        moqOverride: v.moqOverride.trim() ? parseNumberField(v.moqOverride) : undefined,
        leadTimeOverride: v.leadTimeOverride.trim() || undefined,
        materialOverride: v.materialOverride.trim() || undefined,
        optionValueIds:
          v.variantKind === "structured" && v.optionValueIds.length
            ? v.optionValueIds.map((id) => resolveOptionValueRefFromGroups(form.options, id))
            : undefined,
        wholesalePrice: v.wholesalePrice.trim() ? parseNumberField(v.wholesalePrice) : undefined,
        dealerPrice: v.dealerPrice.trim() ? parseNumberField(v.dealerPrice) : undefined,
        stockQty: v.stockQty.trim() ? parseInt(v.stockQty, 10) : 0,
        stockStatus: v.stockStatus,
        variantStatus: v.variantStatus,
        internalNote: v.internalNote.trim() || undefined,
        imageUrl: v.imageUrl.trim() || undefined,
      })),
    };
  }

  function fieldLabel(field: string): string {
    if (field.startsWith("variants.") && field.endsWith(".imageUrl")) return "Ảnh biến thể";
    if (field.endsWith(".dealerPrice")) return "Giá đại lý";
    if (field.endsWith(".wholesalePrice")) return "Giá sỉ";
    if (field.endsWith(".stockQty")) return "Tồn kho";
    if (field === "featuredImage") return "Ảnh đại diện";
    if (field === "productCode") return "ID sản phẩm";
    if (field === "categoryId") return "Danh mục";
    if (field === "name") return "Tên sản phẩm";
    if (field.startsWith("options")) return "Nhóm biến thể";
    return field;
  }

  async function ensureOptionsSavedForMatrix(): Promise<boolean> {
    if (!form.id) return true;
    const localErrors = validateProductCatalogFormLocal(form);
    const optionErrors = Object.fromEntries(
      Object.entries(localErrors).filter(([key]) => key.startsWith("options")),
    );
    if (Object.keys(optionErrors).length > 0) {
      applyValidationErrors(
        optionErrors,
        "Lưu nhóm biến thể trước khi tạo tổ hợp. Vui lòng sửa các trường được đánh dấu.",
      );
      return false;
    }

    const res = await fetch(`/api/admin/products/${form.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ options: buildPayload().options }),
    });
    const body = (await res.json()) as {
      message?: string;
      error?: string;
      fieldErrors?: Record<string, string>;
    };
    if (!res.ok) {
      applyValidationErrors(
        body.fieldErrors ?? { options: body.error ?? body.message ?? "Không thể lưu nhóm biến thể." },
        body.error ?? body.message ?? "Không thể lưu nhóm biến thể.",
      );
      return false;
    }
    await reloadProductFromServer();
    return true;
  }

  async function saveProduct(stayOnVariants = false): Promise<boolean> {
    setError(null);
    setErrorDetail(null);
    setFieldErrors({});

    const localErrors = validateProductCatalogFormLocal(form);
    if (Object.keys(localErrors).length > 0) {
      applyValidationErrors(
        localErrors,
        form.id
          ? "Không thể lưu sản phẩm. Vui lòng kiểm tra các trường được đánh dấu."
          : "Không thể tạo sản phẩm. Vui lòng kiểm tra các trường được đánh dấu.",
      );
      return false;
    }

    setSaving(true);
    const payload = buildPayload();
    const url = form.id ? `/api/admin/products/${form.id}` : "/api/admin/products";
    const method = form.id ? "PATCH" : "POST";

    const saved = await mutate({
      loadingMessage: "Đang lưu thông tin…",
      successMessage: stayOnVariants ? "Đã lưu sản phẩm. Tiếp tục thiết lập biến thể." : "Đã lưu thông tin.",
      action: async () => {
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const body = (await res.json()) as {
          id?: string;
          productCode?: string;
          slug?: string;
          message?: string;
          error?: string;
          detail?: string;
          code?: string;
          fieldErrors?: Record<string, string>;
          issues?: Array<{ field: string; message: string }>;
          options?: Parameters<typeof mapOptionsToFormRows>[0];
          variants?: Parameters<typeof mapVariantsToFormRows>[0];
        };
        if (!res.ok) {
          setErrorDetail(body.detail ?? null);
          const summary =
            body.code === SEO_PUBLISH_QUALITY_GATE_FAILED
              ? SEO_PUBLISH_QUALITY_SUMMARY
              : body.error ?? body.message ?? "Không thể lưu sản phẩm.";
          if (body.fieldErrors && Object.keys(body.fieldErrors).length > 0) {
            applyValidationErrors(body.fieldErrors, summary);
          } else {
            setError(summary);
          }
          return { ok: false as const, message: summary };
        }
        return { ok: true as const, data: body };
      },
      onSuccess: (product) => {
        if (stayOnVariants && product?.id) {
          setForm((prev) => ({
            ...prev,
            id: product.id,
            productCode: product.productCode ?? prev.productCode,
            slug: product.slug ?? prev.slug,
            options: product.options ? mapOptionsToFormRows(product.options) : prev.options,
            variants: product.variants
              ? mapVariantsToFormRows(product.variants).filter(
                  (variant) => !variant.id || !deletedVariantIdsRef.current.has(variant.id),
                )
              : prev.variants,
          }));
          setActiveTab("variants");
          if (!form.id) {
            router.replace(`/admin/products/${product.id}/edit`);
          }
          router.refresh();
          return;
        }
        router.push("/admin/products");
        router.refresh();
      },
    });

    setSaving(false);
    return Boolean(saved);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await saveProduct(false);
  }

  async function saveAndContinueForMatrix(): Promise<boolean> {
    return saveProduct(true);
  }

  const publicSlug = form.slug ?? "";
  const publicUrl = publicSlug ? `/san-pham/${publicSlug}` : null;

  return (
    <form
      className={`admin-catalog-form${activeTab === "variants" ? " admin-catalog-form--variants" : ""}`}
      onSubmit={(e) => void handleSubmit(e)}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
        <h2 className="admin-subtitle" style={{ margin: 0 }}>{form.id ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm mới"}</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {form.id && (
            <>
              <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" onClick={() => setExportDialog("export")}>
                Xuất sản phẩm này
              </button>
              <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" onClick={() => setExportDialog("clone")}>
                Xuất mẫu để nhân bản
              </button>
            </>
          )}
          {publicUrl && (
            <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="admin-btn admin-btn--secondary admin-btn--xs">
              🔗 Xem trên website
            </a>
          )}
        </div>
      </div>

      {form.id && exportDialog && (
        <ProductExportDialog
          open
          onClose={() => setExportDialog(null)}
          defaultScope="single"
          productIds={[form.id]}
          cloneTemplate={exportDialog === "clone"}
        />
      )}

      <div className="admin-catalog-tabs" role="tablist" aria-label="Các phần biểu mẫu sản phẩm">
        {FORM_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`admin-catalog-tab${activeTab === tab.id ? " is-active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <fieldset className="admin-catalog-fieldset" hidden={activeTab !== "basic"}>
        <legend>1. Thông tin cơ bản</legend>
        <div className="admin-seo-brief-form-grid">
          <div className="admin-field" data-field="name">
            <label className="admin-label">Tên sản phẩm <span className="admin-required">*</span></label>
            <input
              className={`admin-input${fieldErrorInputClass(Boolean(fieldErrors.name))}`}
              value={form.name}
              data-field="name"
              onChange={(e) => setField("name", e.target.value)}
              placeholder="Áo thun CVC basic"
            />
            {fieldErrors.name && <p className="admin-field-error" role="alert">{fieldErrors.name}</p>}
          </div>
          <div className="admin-field" data-field="categoryId">
            <label className="admin-label">Danh mục <span className="admin-required">*</span></label>
            <select
              className={`admin-input${fieldErrorInputClass(Boolean(fieldErrors.categoryId))}`}
              value={form.categoryId}
              data-field="categoryId"
              onChange={(e) => setField("categoryId", e.target.value)}
            >
              <option value="">— Chọn danh mục —</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name} {c.skuCode ? `(${c.skuCode})` : ""}</option>)}
            </select>
            {fieldErrors.categoryId && <p className="admin-field-error" role="alert">{fieldErrors.categoryId}</p>}
          </div>
          <div className="admin-field" data-field="productCode">
            <label className="admin-label">
              {form.id ? "ID sản phẩm" : "ID sản phẩm tự động"}
            </label>
            <input
              className={`admin-input${fieldErrorInputClass(Boolean(fieldErrors.productCode))}`}
              value={form.id ? form.productCode : (productCodePreview ?? "")}
              readOnly={!form.id || !allowManualProductCode}
              data-field="productCode"
              placeholder={form.categoryId ? "Đang tải ID dự kiến…" : "Chọn danh mục để xem ID dự kiến"}
              onChange={(e) => setField("productCode", e.target.value)}
            />
            {!form.id && form.categoryId && categorySkuCode && (
              <p className="admin-field-hint">
                Mã danh mục: <strong>{categorySkuCode}</strong>
                {productCodePreview && (
                  <> · ID sản phẩm dự kiến: <code className="admin-catalog-code">{productCodePreview}</code></>
                )}
              </p>
            )}
            {productCodePreviewError && (
              <p className="admin-error" style={{ marginTop: 4 }}>{productCodePreviewError}</p>
            )}
            {!form.id && (
              <p className="admin-field-hint">ID sản phẩm được tạo tự động khi lưu theo thứ tự danh mục (vd. TS0001, TS0002).</p>
            )}
            {form.id && !allowManualProductCode && (
              <button
                type="button"
                className="btn-tertiary btn-sm"
                style={{ marginTop: 6 }}
                onClick={() => setAllowManualProductCode(true)}
              >
                Chỉnh mã thủ công
              </button>
            )}
            {fieldErrors.productCode && <p className="admin-field-error" role="alert">{fieldErrors.productCode}</p>}
          </div>
          <div className="admin-field" data-field="slug">
            <label className="admin-label">Slug</label>
            <input
              className={`admin-input${fieldErrorInputClass(Boolean(fieldErrors.slug))}`}
              value={form.slug ?? ""}
              data-field="slug"
              onChange={(e) => setField("slug", e.target.value)}
              placeholder="tu-sinh-neu-bo-trong"
            />
            {fieldErrors.slug && <p className="admin-field-error" role="alert">{fieldErrors.slug}</p>}
          </div>
          <div className="admin-field">
            <label className="admin-label">Trạng thái</label>
            <select className="admin-input" value={form.status} onChange={(e) => setField("status", e.target.value)}>
              <option value="DRAFT">Nháp</option>
              <option value="ACTIVE">Đang bán</option>
              <option value="INACTIVE">Tạm dừng</option>
              <option value="ARCHIVED">Lưu trữ</option>
            </select>
            {showProductPublishChecklist && (
              <PublishQualityChecklist
                items={productPublishChecklist}
                legacyWarning={showProductLegacySeoWarning}
              />
            )}
          </div>
        </div>
        <div className="admin-field">
          <label className="admin-label">Mô tả ngắn</label>
          <textarea className="admin-textarea" rows={2} value={form.shortDescription} onChange={(e) => setField("shortDescription", e.target.value)} />
        </div>
        <div className="admin-field" data-field="description">
          <label className="admin-label">Mô tả chi tiết</label>
          <textarea
            className={`admin-textarea${fieldErrorInputClass(Boolean(fieldErrors.description))}`}
            rows={4}
            data-field="description"
            value={form.description}
            onChange={(e) => setField("description", e.target.value)}
          />
          {fieldErrors.description && <p className="admin-field-error" role="alert">{fieldErrors.description}</p>}
        </div>
        <div className="admin-field">
          <label className="admin-label">Tags (cách nhau bởi dấu phẩy)</label>
          <input className="admin-input" value={form.tags} onChange={(e) => setField("tags", e.target.value)} placeholder="áo thun trơn, CVC, nguồn hàng sỉ" />
        </div>
      </fieldset>

      {/* ── 2. Thông tin B2B ─────────────────────────────────────────────── */}
      <fieldset className="admin-catalog-fieldset" hidden={activeTab !== "basic"}>
        <legend>2. Thông tin B2B & Sản xuất</legend>
        <div className="admin-seo-brief-form-grid">
          <ProductB2BSharedAttributeField
            attributeCode="MATERIAL"
            label="Chất liệu"
            customValueActionLabel="Nhập chất liệu riêng"
            assignments={form.attributeAssignments}
            sharedAttributes={sharedAttributes}
            sharedAttributesLoading={sharedAttributesLoading}
            fieldErrors={fieldErrors}
            onAssignmentsChange={(attributeAssignments) => setField("attributeAssignments", attributeAssignments)}
            onRefreshSharedAttributes={loadSharedAttributes}
          />
          <div className="admin-field">
            <ProductB2BSharedAttributeField
              attributeCode="FIT"
              label="Form / Kiểu dáng"
              customValueActionLabel="Nhập form riêng"
              assignments={form.attributeAssignments}
              sharedAttributes={sharedAttributes}
              sharedAttributesLoading={sharedAttributesLoading}
              fieldErrors={fieldErrors}
              onAssignmentsChange={(attributeAssignments) => setField("attributeAssignments", attributeAssignments)}
              onRefreshSharedAttributes={loadSharedAttributes}
            />
            {initialLegacyFit && !legacyFitClearPending && (
              <div className="admin-field-hint" style={{ marginTop: 8 }}>
                Fit cũ: {initialLegacyFit}
                {" "}
                <button
                  type="button"
                  className="admin-btn admin-btn--secondary admin-btn--xs"
                  onClick={() => {
                    if (!window.confirm("Xóa dữ liệu Fit cũ khỏi sản phẩm khi lưu?")) return;
                    setLegacyFitClearPending(true);
                  }}
                >
                  Xóa dữ liệu Fit cũ
                </button>
              </div>
            )}
            {legacyFitClearPending && (
              <p className="admin-field-hint" style={{ marginTop: 8 }}>
                Dữ liệu Fit cũ sẽ được xóa khi lưu sản phẩm.
              </p>
            )}
          </div>
          <div className="admin-field" data-field="defaultMoq">
            <label className="admin-label">MOQ tối thiểu (cái)</label>
            <input
              className={`admin-input${fieldErrorInputClass(Boolean(fieldErrors.defaultMoq))}`}
              type="number"
              min="1"
              data-field="defaultMoq"
              value={form.defaultMoq}
              onChange={(e) => setField("defaultMoq", e.target.value)}
              placeholder="50"
            />
            {fieldErrors.defaultMoq && <p className="admin-field-error" role="alert">{fieldErrors.defaultMoq}</p>}
            <p className="admin-field-hint">Số lượng tối thiểu cho một đơn sỉ</p>
          </div>
          <div className="admin-field" data-field="leadTime">
            <label className="admin-label">Lead-time (thời gian giao/sản xuất)</label>
            <input
              className={`admin-input${fieldErrorInputClass(Boolean(fieldErrors.leadTime))}`}
              value={form.leadTime}
              data-field="leadTime"
              onChange={(e) => setField("leadTime", e.target.value)}
              placeholder="Có sẵn: 1–3 ngày"
            />
            {fieldErrors.leadTime && <p className="admin-field-error" role="alert">{fieldErrors.leadTime}</p>}
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
              {LEAD_TIME_PRESETS.map((preset) => (
                <button key={preset} type="button" className="admin-btn admin-btn--secondary admin-btn--xs"
                  onClick={() => setField("leadTime", preset)}>
                  {preset}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="admin-seo-brief-form-grid">
          <div className="admin-field">
            <label className="admin-label">Ứng dụng B2B (cách nhau bởi dấu phẩy)</label>
            <input className="admin-input" value={form.useCases} onChange={(e) => setField("useCases", e.target.value)} placeholder="Xưởng in, Đồng phục công ty, Đại lý sỉ" />
          </div>
          <div className="admin-field">
            <label className="admin-label">Đối tượng phù hợp (cách nhau bởi dấu phẩy)</label>
            <input className="admin-input" value={form.targetCustomers} onChange={(e) => setField("targetCustomers", e.target.value)} placeholder="Đại lý sỉ, Doanh nghiệp, Agency" />
          </div>
        </div>

        <div className="admin-catalog-toggles">
          <label className="admin-catalog-toggle">
            <input type="checkbox" checked={form.supportsPrinting} onChange={(e) => setField("supportsPrinting", e.target.checked)} />
            Hỗ trợ in
          </label>
          <label className="admin-catalog-toggle">
            <input type="checkbox" checked={form.supportsEmbroidery} onChange={(e) => setField("supportsEmbroidery", e.target.checked)} />
            Hỗ trợ thêu
          </label>
          <label className="admin-catalog-toggle">
            <input type="checkbox" checked={form.supportsOem} onChange={(e) => setField("supportsOem", e.target.checked)} />
            Hỗ trợ OEM
          </label>
        </div>
      </fieldset>

      {/* ── 3. Hình ảnh ──────────────────────────────────────────────────── */}
      <fieldset className="admin-catalog-fieldset" hidden={activeTab !== "media"}>
        <legend>3. Hình ảnh sản phẩm</legend>
        <p className="admin-field-hint">Ảnh nên tối ưu 200–300KB trước khi upload để website tải nhanh.</p>

        {/* Featured image */}
        <div className="admin-field" data-field="featuredImage">
          <label className="admin-label">Ảnh đại diện</label>
          <MediaPicker
            label="Ảnh đại diện"
            value={form.featuredImage}
            onChange={(url) => setField("featuredImage", url)}
            folder="products"
          />
          <p className="admin-field-hint" style={{ marginTop: 6 }}>Hoặc nhập URL ảnh trực tiếp:</p>
          <input
            className={`admin-input${fieldErrorInputClass(Boolean(fieldErrors.featuredImage))}`}
            value={form.featuredImage}
            data-field="featuredImage"
            onChange={(e) => setField("featuredImage", e.target.value)}
            placeholder="https://… hoặc chọn từ thư viện ảnh phía trên"
          />
          {fieldErrors.featuredImage && (
            <p className="admin-field-error" role="alert">{fieldErrors.featuredImage}</p>
          )}
        </div>

        {/* Gallery */}
        <div className="admin-field">
          <label className="admin-label">Thư viện ảnh (gallery)</label>
          <div className="admin-catalog-gallery-picker">
            <MediaPicker
              multiple={true}
              selectedUrls={form.gallery}
              onAdd={(urls) => {
                const existing = new Set(form.gallery);
                const toAdd = urls.filter((u) => !existing.has(u));
                setField("gallery", [...form.gallery, ...toAdd]);
              }}
              folder="products"
            />
            <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs"
              onClick={() => setField("gallery", [...form.gallery, ""])}>
              + Thêm ảnh từ URL
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
            {form.gallery.map((url, idx) => (
              <div key={idx} className="admin-catalog-gallery-row">
                {url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={url} alt="" style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 4, border: "1px solid #e5e7eb", flexShrink: 0 }} />
                )}
                <input
                  className={`admin-input${fieldErrorInputClass(Boolean(fieldErrors[`gallery.${idx}`]))}`}
                  value={url}
                  data-field={`gallery.${idx}`}
                  onChange={(e) => {
                    const next = [...form.gallery];
                    next[idx] = e.target.value;
                    setField("gallery", next);
                  }}
                  placeholder="URL ảnh gallery"
                />
                <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" title="Di chuyển lên" disabled={idx === 0} onClick={() => moveGallery(idx, -1)}>↑</button>
                <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" title="Di chuyển xuống" disabled={idx === form.gallery.length - 1} onClick={() => moveGallery(idx, 1)}>↓</button>
                <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" title="Xóa ảnh" onClick={() => setField("gallery", form.gallery.filter((_, i) => i !== idx))}>✕</button>
                {fieldErrors[`gallery.${idx}`] && (
                  <p className="admin-field-error" role="alert" style={{ flex: "1 1 100%" }}>
                    {fieldErrors[`gallery.${idx}`]}
                  </p>
                )}
              </div>
            ))}
          </div>
          {form.gallery.length === 0 && <p className="admin-field-hint">Chưa có ảnh gallery. Chọn từ thư viện hoặc nhập URL.</p>}
        </div>
      </fieldset>

      {/* ── 4. Biến thể ───────────────────────────────────────────────────── */}
      <fieldset className="admin-catalog-fieldset" hidden={activeTab !== "variants"}>
        <legend>Thuộc tính &amp; biến thể</legend>
        <ProductCatalogVariantsSection
          productId={form.id}
          productCode={form.productCode || productCodePreview || ""}
          defaultMoq={form.defaultMoq}
          defaultLeadTime={form.leadTime}
          optionGroups={form.options}
          variants={form.variants}
          sharedAttributes={sharedAttributes}
          sharedAttributesLoading={sharedAttributesLoading}
          sharedAttributesError={sharedAttributesError}
          onRefreshSharedAttributes={() => void loadSharedAttributes()}
          fieldErrors={fieldErrors}
          onOptionGroupsChange={(options) => setField("options", options)}
          onVariantsChange={(variants) => setField("variants", variants)}
          onReloadProduct={reloadProductFromServer}
          onBeforeMatrixGenerate={ensureOptionsSavedForMatrix}
          onSaveAndContinue={saveAndContinueForMatrix}
          onVariantDeleted={handleVariantDeleted}
          onBulkOperationChange={setBulkOpInProgress}
        />
        {fieldErrors.options && (
          <p className="admin-field-error" role="alert">{fieldErrors.options}</p>
        )}
      </fieldset>

      <fieldset className="admin-catalog-fieldset" hidden={activeTab !== "content"}>
        <legend>Mô tả & thông số</legend>
        <div className="admin-field">
          <label className="admin-label">Tóm tắt ngắn (hiển thị gần tiêu đề PDP)</label>
          <textarea className="admin-textarea" rows={2} value={form.shortDescription} onChange={(e) => setField("shortDescription", e.target.value)} />
        </div>
        <div className="admin-field">
          <label className="admin-label">Mô tả sản phẩm đầy đủ</label>
          <textarea className="admin-textarea" rows={8} value={form.description} onChange={(e) => setField("description", e.target.value)} />
          <p className="admin-field-hint">Nội dung văn bản an toàn — không dán HTML thô từ nguồn không tin cậy.</p>
        </div>
        <ProductInformationAttributesSection
          rows={form.attributeAssignments}
          sharedAttributes={sharedAttributes}
          sharedAttributesLoading={sharedAttributesLoading}
          sharedAttributesError={sharedAttributesError}
          fieldErrors={fieldErrors}
          onChange={(attributeAssignments) => setField("attributeAssignments", attributeAssignments)}
          onRefreshSharedAttributes={loadSharedAttributes}
          sectionRef={attributeSectionRef}
        />
        <ProductCatalogSpecificationsSection
          rows={form.specifications}
          fieldErrors={fieldErrors}
          onChange={(specifications) => setField("specifications", specifications)}
        />
        <ProductCatalogContentSection
          rows={form.customizations}
          fieldErrors={fieldErrors}
          onChange={(customizations) => setField("customizations", customizations)}
        />
      </fieldset>

      <fieldset className="admin-catalog-fieldset" hidden={activeTab !== "seo"}>
        <legend>SEO & hiển thị</legend>
        <div className="admin-field" data-field="seoTitle">
          <label className="admin-label">SEO title</label>
          <input
            className={`admin-input${fieldErrorInputClass(Boolean(fieldErrors.seoTitle))}`}
            data-field="seoTitle"
            value={form.seoTitle}
            onChange={(e) => setField("seoTitle", e.target.value)}
          />
          {fieldErrors.seoTitle && <p className="admin-field-error" role="alert">{fieldErrors.seoTitle}</p>}
        </div>
        <div className="admin-field" data-field="seoDescription">
          <label className="admin-label">SEO description</label>
          <textarea
            className={`admin-textarea${fieldErrorInputClass(Boolean(fieldErrors.seoDescription))}`}
            rows={3}
            data-field="seoDescription"
            value={form.seoDescription}
            onChange={(e) => setField("seoDescription", e.target.value)}
          />
          {fieldErrors.seoDescription && <p className="admin-field-error" role="alert">{fieldErrors.seoDescription}</p>}
        </div>
        {publicUrl && (
          <p className="admin-field-hint">
            Xem trước công khai: <a href={publicUrl} target="_blank" rel="noopener noreferrer">{publicUrl}</a>
          </p>
        )}
      </fieldset>

      {error && (
        <div className="admin-catalog-fieldset admin-import-error-panel">
          <p className="admin-error">{error}</p>
          {Object.keys(fieldErrors).length > 0 && (
            <ul className="admin-kb-warning-list">
              {Object.entries(fieldErrors).map(([field, message]) => (
                <li key={field}><strong>{fieldLabel(field)}:</strong> {message}</li>
              ))}
            </ul>
          )}
          {errorDetail && (
            <details className="admin-import-error-detail">
              <summary>Chi tiết lỗi</summary>
              <pre>{errorDetail}</pre>
            </details>
          )}
        </div>
      )}

      {form.id && <ProductMaterialSection productId={form.id} />}

      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <button type="submit" className="admin-btn admin-btn--primary" disabled={saving || bulkOpInProgress}>
          {saving ? "Đang lưu…" : bulkOpInProgress ? "Đang cập nhật biến thể…" : form.id ? "Lưu thay đổi" : "Tạo sản phẩm"}
        </button>
        <button type="button" className="admin-btn admin-btn--secondary" onClick={() => router.push("/admin/products")}>
          Hủy
        </button>
        {publicUrl && (
          <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="admin-btn admin-btn--secondary">
            Xem trên website ↗
          </a>
        )}
      </div>
    </form>
  );
}
