"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import MediaPicker from "@/components/admin/media/MediaPicker";
import ProductMaterialSection from "@/components/admin/products/ProductMaterialSection";
import ProductCatalogSpecificationsSection, {
  type ProductSpecificationFormRow,
} from "@/components/admin/products/ProductCatalogSpecificationsSection";
import ProductCatalogContentSection, {
  type ProductCustomizationFormRow,
} from "@/components/admin/products/ProductCatalogContentSection";
import ProductCatalogVariantsSection, {
  type MatrixVariantFormRow,
  mapOptionsToFormRows,
  mapVariantsToFormRows,
} from "@/components/admin/products/ProductCatalogVariantsSection";
import ProductExportDialog from "@/components/admin/products/ProductExportDialog";
import type { OptionGroupFormRow } from "@/components/admin/products/ProductOptionGroupBuilder";
import {
  combinationSignature,
  resolveOptionValueRefFromGroups,
} from "@/features/products/product-variant-matrix.utils";
import { useAdminMutation } from "@/hooks/useAdminAction";
import { parseAdminJsonResponse } from "@/lib/admin/adminMutation";
import { isValidImageUrl } from "@/features/products/product-admin-input";
import { PRODUCT_IMAGE_URL_ERROR } from "@/features/products/product-image-url";

type Category = { id: string; name: string; slug: string; skuCode: string | null };
type AttributeOption = { id: string; type: string; name: string; code: string | null; value: string | null };
type AttrMap = Record<string, AttributeOption[]>;

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
  customizations: ProductCustomizationFormRow[];
  options: OptionGroupFormRow[];
  variants: MatrixVariantFormRow[];
};

const FORM_TABS = [
  { id: "basic", label: "Thông tin cơ bản" },
  { id: "media", label: "Hình ảnh & media" },
  { id: "variants", label: "Biến thể" },
  { id: "content", label: "Mô tả & thông số" },
  { id: "seo", label: "SEO & hiển thị" },
] as const;

type FormTabId = (typeof FORM_TABS)[number]["id"];

type Props = {
  initialData?: Partial<ProductFormData> & { id?: string; slug?: string };
  categories?: Category[];
};

const LEAD_TIME_PRESETS = [
  "Có sẵn: 1–3 ngày",
  "Đặt hàng: 5–10 ngày",
  "OEM: 10–20 ngày tùy số lượng",
  "Thỏa thuận theo đơn hàng",
];

export default function ProductCatalogForm({ initialData, categories: propCategories }: Props) {
  const router = useRouter();
  const mutate = useAdminMutation();
  const [categories, setCategories] = useState<Category[]>(propCategories ?? []);
  const [attributes, setAttributes] = useState<AttrMap>({});
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
  const deletedVariantIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!propCategories) {
      void fetch("/api/admin/products/categories")
        .then((r) => r.json())
        .then((cats: Category[]) => setCategories(cats));
    }
    void fetch("/api/admin/products/attributes")
      .then((r) => r.json())
      .then((opts: AttributeOption[]) => {
        const map: AttrMap = {};
        for (const opt of opts) {
          if (!map[opt.type]) map[opt.type] = [];
          map[opt.type].push(opt);
        }
        setAttributes(map);
      });
  }, [propCategories]);

  useEffect(() => {
    if (form.id || !form.categoryId) {
      if (!form.id) {
        setProductCodePreview(null);
        setCategorySkuCode(null);
        setProductCodePreviewError(null);
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

  function parseNumberField(value: string): number | undefined {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const n = parseFloat(trimmed.replace(/[,\s]/g, ""));
    return Number.isFinite(n) ? n : undefined;
  }

  function validateFormLocally(): Record<string, string> {
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = "Tên sản phẩm là bắt buộc.";
    if (!form.categoryId) errors.categoryId = "Vui lòng chọn danh mục.";

    if (form.featuredImage.trim() && !isValidImageUrl(form.featuredImage)) {
      errors.featuredImage = PRODUCT_IMAGE_URL_ERROR;
    }

    form.gallery.forEach((url, index) => {
      if (url.trim() && !isValidImageUrl(url)) {
        errors[`gallery.${index}`] = PRODUCT_IMAGE_URL_ERROR;
      }
    });

    if (form.defaultMoq.trim() && parseNumberField(form.defaultMoq) === undefined) {
      errors.defaultMoq = "MOQ phải là số.";
    }

    form.variants.forEach((v, index) => {
      const prefix = `variants.${index}`;
      if (v.wholesalePrice.trim() && parseNumberField(v.wholesalePrice) === undefined) {
        errors[`${prefix}.wholesalePrice`] = "Giá sỉ phải là số.";
      }
      if (v.dealerPrice.trim() && parseNumberField(v.dealerPrice) === undefined) {
        errors[`${prefix}.dealerPrice`] = "Giá đại lý phải là số.";
      }
      if (v.stockQty.trim() && !Number.isInteger(Number(v.stockQty))) {
        errors[`${prefix}.stockQty`] = "Tồn kho phải là số.";
      }
      if (v.imageUrl.trim() && !isValidImageUrl(v.imageUrl)) {
        errors[`${prefix}.imageUrl`] = PRODUCT_IMAGE_URL_ERROR;
      }
      if (v.variantKind === "structured" && v.optionValueIds.length === 0) {
        errors[`${prefix}.optionValueIds`] = "Chọn ít nhất một giá trị thuộc tính cho biến thể.";
      }
    });

    const structuredCombos = new Set<string>();
    for (const variant of form.variants) {
      if (variant.variantKind !== "structured" || !variant.optionValueIds.length) continue;
      const refs = variant.optionValueIds.map((id) =>
        resolveOptionValueRefFromGroups(form.options, id),
      );
      const signature = combinationSignature(refs);
      if (structuredCombos.has(signature)) {
        errors.variants = "Tồn tại biến thể trùng tổ hợp thuộc tính.";
        break;
      }
      structuredCombos.add(signature);
    }

    return errors;
  }

  function resolveTabForField(field: string): FormTabId {
    if (field.startsWith("variants") || field === "variants") return "variants";
    if (field.startsWith("gallery") || field === "featuredImage") return "media";
    if (
      field === "shortDescription" ||
      field === "description" ||
      field.startsWith("specifications") ||
      field.startsWith("customizations")
    ) {
      return "content";
    }
    if (field.startsWith("seo")) return "seo";
    return "basic";
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
    return field;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setErrorDetail(null);
    setFieldErrors({});

    const localErrors = validateFormLocally();
    if (Object.keys(localErrors).length > 0) {
      setFieldErrors(localErrors);
      const firstField = Object.keys(localErrors)[0];
      if (firstField) setActiveTab(resolveTabForField(firstField));
      setError("Không thể tạo sản phẩm. Vui lòng kiểm tra các trường được đánh dấu.");
      return;
    }

    setSaving(true);

    const payload = {
      name: form.name.trim(),
      ...(form.id ? { productCode: form.productCode.trim() || undefined } : {}),
      categoryId: form.categoryId,
      shortDescription: form.shortDescription.trim() || undefined,
      description: form.description.trim() || undefined,
      seoTitle: form.seoTitle.trim() || undefined,
      seoDescription: form.seoDescription.trim() || undefined,
      material: form.material.trim() || undefined,
      form: form.form.trim() || undefined,
      fit: form.fit.trim() || undefined,
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
      options: form.options
        .filter((group) => group.name.trim())
        .map((group, index) => ({
          id: group.id,
          name: group.name.trim(),
          slug: group.slug.trim() || undefined,
          sortOrder: group.sortOrder ?? index,
          values: group.values
            .filter((value) => value.label.trim())
            .map((value, valueIndex) => ({
              id: value.id,
              label: value.label.trim(),
              valueCode: value.valueCode.trim() || undefined,
              imageUrl: value.imageUrl.trim() || undefined,
              sortOrder: value.sortOrder ?? valueIndex,
            })),
        })),
      variants: form.variants.map((v) => ({
        id: v.id,
        sku: v.sku.trim() || undefined,
        colorName: v.variantKind === "legacy" ? v.colorName.trim() || undefined : v.colorName.trim() || undefined,
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

    const url = form.id ? `/api/admin/products/${form.id}` : "/api/admin/products";
    const method = form.id ? "PATCH" : "POST";

    const saved = await mutate({
      loadingMessage: "Đang lưu thông tin…",
      successMessage: "Đã lưu thông tin.",
      action: async () => {
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const body = (await res.json()) as {
          message?: string;
          error?: string;
          detail?: string;
          fieldErrors?: Record<string, string>;
        };
        if (!res.ok) {
          setError(body.error ?? body.message ?? "Không thể lưu sản phẩm.");
          setErrorDetail(body.detail ?? null);
          setFieldErrors(body.fieldErrors ?? {});
          return { ok: false as const, message: body.error ?? body.message };
        }
        return { ok: true as const, data: true };
      },
      onSuccess: () => {
        router.push("/admin/products");
        router.refresh();
      },
    });

    if (!saved) {
      // field-level errors already set above when response parsed
    }
    setSaving(false);
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
          <div className="admin-field">
            <label className="admin-label">Tên sản phẩm <span className="admin-required">*</span></label>
            <input className="admin-input" value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="Áo thun CVC basic" />
          </div>
          <div className="admin-field">
            <label className="admin-label">Danh mục <span className="admin-required">*</span></label>
            <select className="admin-input" value={form.categoryId} onChange={(e) => setField("categoryId", e.target.value)}>
              <option value="">— Chọn danh mục —</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name} {c.skuCode ? `(${c.skuCode})` : ""}</option>)}
            </select>
          </div>
          <div className="admin-field">
            <label className="admin-label">
              {form.id ? "ID sản phẩm" : "ID sản phẩm tự động"}
            </label>
            <input
              className="admin-input"
              value={form.id ? form.productCode : (productCodePreview ?? "")}
              readOnly
              placeholder={form.categoryId ? "Đang tải ID dự kiến…" : "Chọn danh mục để xem ID dự kiến"}
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
          </div>
          <div className="admin-field">
            <label className="admin-label">Trạng thái</label>
            <select className="admin-input" value={form.status} onChange={(e) => setField("status", e.target.value)}>
              <option value="DRAFT">Nháp</option>
              <option value="ACTIVE">Đang bán</option>
              <option value="INACTIVE">Tạm dừng</option>
              <option value="ARCHIVED">Lưu trữ</option>
            </select>
          </div>
        </div>
        <div className="admin-field">
          <label className="admin-label">Mô tả ngắn</label>
          <textarea className="admin-textarea" rows={2} value={form.shortDescription} onChange={(e) => setField("shortDescription", e.target.value)} />
        </div>
        <div className="admin-field">
          <label className="admin-label">Mô tả chi tiết</label>
          <textarea className="admin-textarea" rows={4} value={form.description} onChange={(e) => setField("description", e.target.value)} />
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
          <div className="admin-field">
            <label className="admin-label">Chất liệu</label>
            {(attributes.MATERIAL?.length ?? 0) > 0 && (
              <select className="admin-input" value={form.material} onChange={(e) => setField("material", e.target.value)} style={{ marginBottom: 4 }}>
                <option value="">— Chọn —</option>
                {(attributes.MATERIAL ?? []).map((o) => <option key={o.id} value={o.name}>{o.name}</option>)}
              </select>
            )}
            <input className="admin-input" value={form.material} onChange={(e) => setField("material", e.target.value)} placeholder="CVC 65/35, Cotton 100%… (nhập thủ công)" />
          </div>
          <div className="admin-field">
            <label className="admin-label">Form / Kiểu dáng</label>
            {(attributes.FORM?.length ?? 0) > 0 && (
              <select className="admin-input" value={form.form} onChange={(e) => setField("form", e.target.value)} style={{ marginBottom: 4 }}>
                <option value="">— Chọn —</option>
                {(attributes.FORM ?? []).map((o) => <option key={o.id} value={o.name}>{o.name}</option>)}
              </select>
            )}
            <input className="admin-input" value={form.form} onChange={(e) => setField("form", e.target.value)} placeholder="Regular fit, Slim fit, Oversize… (nhập thủ công)" />
          </div>
          <div className="admin-field">
            <label className="admin-label">Fit</label>
            <input className="admin-input" value={form.fit} onChange={(e) => setField("fit", e.target.value)} placeholder="Unisex, Regular, Slim…" />
          </div>
          <div className="admin-field">
            <label className="admin-label">MOQ tối thiểu (cái)</label>
            <input className="admin-input" type="number" min="1" value={form.defaultMoq} onChange={(e) => setField("defaultMoq", e.target.value)} placeholder="50" />
            <p className="admin-field-hint">Số lượng tối thiểu cho một đơn sỉ</p>
          </div>
          <div className="admin-field">
            <label className="admin-label">Lead-time (thời gian giao/sản xuất)</label>
            <input
              className="admin-input"
              value={form.leadTime}
              onChange={(e) => setField("leadTime", e.target.value)}
              placeholder="Có sẵn: 1–3 ngày"
            />
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
        <div className="admin-field">
          <label className="admin-label">Ảnh đại diện</label>
          <MediaPicker
            label="Ảnh đại diện"
            value={form.featuredImage}
            onChange={(url) => setField("featuredImage", url)}
            folder="products"
          />
          <p className="admin-field-hint" style={{ marginTop: 6 }}>Hoặc nhập URL ảnh trực tiếp:</p>
          <input
            className="admin-input"
            value={form.featuredImage}
            onChange={(e) => setField("featuredImage", e.target.value)}
            placeholder="https://… hoặc chọn từ thư viện ảnh phía trên"
          />
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
                  className="admin-input"
                  value={url}
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
              </div>
            ))}
          </div>
          {form.gallery.length === 0 && <p className="admin-field-hint">Chưa có ảnh gallery. Chọn từ thư viện hoặc nhập URL.</p>}
        </div>
      </fieldset>

      {/* ── 4. Biến thể ───────────────────────────────────────────────────── */}
      <fieldset className="admin-catalog-fieldset" hidden={activeTab !== "variants"}>
        <legend>4. Biến thể / SKU lựa chọn</legend>
        <ProductCatalogVariantsSection
          productId={form.id}
          productCode={form.productCode || productCodePreview || ""}
          defaultMoq={form.defaultMoq}
          defaultLeadTime={form.leadTime}
          optionGroups={form.options}
          variants={form.variants}
          onOptionGroupsChange={(options) => setField("options", options)}
          onVariantsChange={(variants) => setField("variants", variants)}
          onReloadProduct={reloadProductFromServer}
          onVariantDeleted={handleVariantDeleted}
          onBulkOperationChange={setBulkOpInProgress}
        />
        {fieldErrors.variants && (
          <p className="admin-field-error" role="alert">{fieldErrors.variants}</p>
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
        <ProductCatalogSpecificationsSection
          rows={form.specifications}
          onChange={(specifications) => setField("specifications", specifications)}
        />
        <ProductCatalogContentSection
          rows={form.customizations}
          onChange={(customizations) => setField("customizations", customizations)}
        />
      </fieldset>

      <fieldset className="admin-catalog-fieldset" hidden={activeTab !== "seo"}>
        <legend>SEO & hiển thị</legend>
        <div className="admin-field">
          <label className="admin-label">SEO title</label>
          <input className="admin-input" value={form.seoTitle} onChange={(e) => setField("seoTitle", e.target.value)} />
        </div>
        <div className="admin-field">
          <label className="admin-label">SEO description</label>
          <textarea className="admin-textarea" rows={3} value={form.seoDescription} onChange={(e) => setField("seoDescription", e.target.value)} />
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
