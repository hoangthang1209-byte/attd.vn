"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MediaPicker from "@/components/admin/media/MediaPicker";

type Category = { id: string; name: string; slug: string; skuCode: string | null };
type AttributeOption = { id: string; type: string; name: string; code: string | null; value: string | null };

type VariantFormRow = {
  id?: string;
  colorName: string;
  colorCode: string;
  sizeName: string;
  dimensions: string;
  capacity: string;
  wholesalePrice: string;
  dealerPrice: string;
  stockQty: string;
  stockStatus: string;
  internalNote: string;
  imageUrl: string;
  skuPreview: string;
  skuTaken: boolean;
};

type ProductFormData = {
  id?: string;
  slug?: string;
  name: string;
  productCode: string;
  categoryId: string;
  shortDescription: string;
  description: string;
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
  variants: VariantFormRow[];
};

const defaultVariant = (): VariantFormRow => ({
  colorName: "", colorCode: "", sizeName: "", dimensions: "", capacity: "",
  wholesalePrice: "", dealerPrice: "", stockQty: "0", stockStatus: "IN_STOCK",
  internalNote: "", imageUrl: "", skuPreview: "", skuTaken: false,
});

type Props = {
  initialData?: Partial<ProductFormData> & { id?: string; slug?: string };
  categories?: Category[];
};

type AttrMap = Record<string, AttributeOption[]>;

const LEAD_TIME_PRESETS = [
  "Có sẵn: 1–3 ngày",
  "Đặt hàng: 5–10 ngày",
  "OEM: 10–20 ngày tùy số lượng",
  "Thỏa thuận theo đơn hàng",
];

export default function ProductCatalogForm({ initialData, categories: propCategories }: Props) {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>(propCategories ?? []);
  const [attributes, setAttributes] = useState<AttrMap>({});
  const [form, setForm] = useState<ProductFormData>({
    id: initialData?.id,
    slug: initialData?.slug,
    name: initialData?.name ?? "",
    productCode: initialData?.productCode ?? "",
    categoryId: initialData?.categoryId ?? "",
    shortDescription: initialData?.shortDescription ?? "",
    description: initialData?.description ?? "",
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
    variants: initialData?.variants ?? [defaultVariant()],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [productCodePreview, setProductCodePreview] = useState<string | null>(
    initialData?.productCode ?? null
  );
  const [categorySkuCode, setCategorySkuCode] = useState<string | null>(null);
  const [productCodePreviewError, setProductCodePreviewError] = useState<string | null>(null);

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

  async function previewSku(index: number) {
    const v = form.variants[index];
    if (!form.categoryId && !form.productCode && !form.id) return;
    try {
      const res = await fetch("/api/admin/products/sku-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: form.categoryId,
          productCode: form.id ? (form.productCode || undefined) : undefined,
          colorName: v.colorName || undefined,
          colorCode: v.colorCode || undefined,
          sizeName: v.sizeName || undefined,
          dimensions: v.dimensions || undefined,
          capacity: v.capacity || undefined,
          excludeVariantId: v.id,
          excludeProductId: form.id,
        }),
      });
      const data = await res.json() as {
        sku?: string;
        variantSkuPreview?: string | null;
        productCodePreview?: string | null;
        isTaken?: boolean;
        message?: string;
      };
      if (!res.ok) {
        updateVariant(index, { skuPreview: data.message ?? "Lỗi xem trước", skuTaken: false });
        return;
      }
      const variantSku = data.variantSkuPreview ?? data.sku ?? "";
      updateVariant(index, { skuPreview: variantSku, skuTaken: data.isTaken ?? false });
      if (!form.id && data.productCodePreview) {
        setProductCodePreview(data.productCodePreview);
      }
    } catch { /* ignore */ }
  }

  function setField<K extends keyof ProductFormData>(key: K, value: ProductFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateVariant(index: number, patch: Partial<VariantFormRow>) {
    setForm((prev) => {
      const variants = [...prev.variants];
      variants[index] = { ...variants[index], ...patch };
      return { ...prev, variants };
    });
  }

  function addVariant() {
    setForm((prev) => ({ ...prev, variants: [...prev.variants, defaultVariant()] }));
  }

  function removeVariant(index: number) {
    setForm((prev) => ({ ...prev, variants: prev.variants.filter((_, i) => i !== index) }));
  }

  function moveGallery(idx: number, dir: -1 | 1) {
    const arr = [...form.gallery];
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= arr.length) return;
    [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
    setField("gallery", arr);
  }

  function isValidImageUrl(value: string): boolean {
    return /^https?:\/\/.+/i.test(value.trim());
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
      errors.featuredImage = "URL ảnh không hợp lệ. Vui lòng dùng link ảnh bắt đầu bằng https://.";
    }

    form.gallery.forEach((url, index) => {
      if (url.trim() && !isValidImageUrl(url)) {
        errors[`gallery.${index}`] = "URL ảnh gallery không hợp lệ.";
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
        errors[`${prefix}.imageUrl`] = "Ảnh biến thể không hợp lệ.";
      }
    });

    return errors;
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
      variants: form.variants.map((v) => ({
        id: v.id,
        colorName: v.colorName.trim() || undefined,
        colorCode: v.colorCode.trim() || undefined,
        sizeName: v.sizeName.trim() || undefined,
        dimensions: v.dimensions.trim() || undefined,
        capacity: v.capacity.trim() || undefined,
        wholesalePrice: v.wholesalePrice.trim() ? parseNumberField(v.wholesalePrice) : undefined,
        dealerPrice: v.dealerPrice.trim() ? parseNumberField(v.dealerPrice) : undefined,
        stockQty: v.stockQty.trim() ? parseInt(v.stockQty, 10) : 0,
        stockStatus: v.stockStatus,
        internalNote: v.internalNote.trim() || undefined,
        imageUrl: v.imageUrl.trim() || undefined,
      })),
    };

    try {
      const url = form.id ? `/api/admin/products/${form.id}` : "/api/admin/products";
      const method = form.id ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json() as {
        id?: string;
        slug?: string;
        message?: string;
        error?: string;
        detail?: string;
        fieldErrors?: Record<string, string>;
      };

      if (!res.ok) {
        setError(data.error ?? data.message ?? "Không thể lưu sản phẩm.");
        setErrorDetail(data.detail ?? null);
        setFieldErrors(data.fieldErrors ?? {});
        return;
      }

      router.push("/admin/products");
      router.refresh();
    } catch (err) {
      setError("Không thể lưu sản phẩm.");
      setErrorDetail(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  const publicSlug = form.slug ?? "";
  const publicUrl = publicSlug ? `/san-pham/${publicSlug}` : null;

  return (
    <form className="admin-catalog-form" onSubmit={(e) => void handleSubmit(e)}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
        <h2 className="admin-subtitle" style={{ margin: 0 }}>{form.id ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm mới"}</h2>
        {publicUrl && (
          <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="admin-btn admin-btn--secondary admin-btn--xs">
            🔗 Xem trên website
          </a>
        )}
      </div>

      {/* ── 1. Thông tin cơ bản ─────────────────────────────────────────── */}
      <fieldset className="admin-catalog-fieldset">
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
      <fieldset className="admin-catalog-fieldset">
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
      <fieldset className="admin-catalog-fieldset">
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

      {/* ── 4. Biến thể / SKU lựa chọn ───────────────────────────────────── */}
      <fieldset className="admin-catalog-fieldset">
        <legend>4. Biến thể / SKU lựa chọn</legend>
        <p className="admin-field-hint">Nhấn &quot;Xem ID dự kiến&quot; để xem SKU lựa chọn trước khi lưu. Mã màu nên theo chuẩn BLK, WHT, NVY…</p>

        {form.variants.map((v, i) => (
          <div key={i} className="admin-catalog-variant-row">
            <div className="admin-catalog-variant-header">
              <strong>Biến thể #{i + 1}</strong>
              {v.skuPreview && (
                <code className={`admin-catalog-code ${v.skuTaken ? "is-taken" : "is-ok"}`}>
                  {v.skuPreview} {v.skuTaken ? "⚠ Đã tồn tại" : "✓"}
                </code>
              )}
              <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" onClick={() => void previewSku(i)}>Xem ID dự kiến</button>
              {form.variants.length > 1 && (
                <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" onClick={() => removeVariant(i)}>Xóa</button>
              )}
            </div>
            <div className="admin-catalog-variant-fields">
              <div className="admin-field">
                <label className="admin-label">Màu sắc</label>
                {(attributes.COLOR?.length ?? 0) > 0 && (
                  <select className="admin-input" value={v.colorName} onChange={(e) => {
                    const opt = attributes.COLOR?.find((o) => o.name === e.target.value);
                    updateVariant(i, { colorName: e.target.value, colorCode: opt?.code ?? v.colorCode });
                  }}>
                    <option value="">— Chọn —</option>
                    {(attributes.COLOR ?? []).map((o) => <option key={o.id} value={o.name}>{o.name} ({o.code})</option>)}
                  </select>
                )}
                <input className="admin-input" value={v.colorName} onChange={(e) => updateVariant(i, { colorName: e.target.value })} placeholder="Đen, Trắng… (nhập thủ công)" style={{ marginTop: 4 }} />
              </div>
              <div className="admin-field">
                <label className="admin-label">Mã màu</label>
                <input className="admin-input" value={v.colorCode} onChange={(e) => updateVariant(i, { colorCode: e.target.value })} placeholder="BLK, WHT, NVY…" />
                <p className="admin-field-hint">Dùng trong SKU lựa chọn</p>
              </div>
              <div className="admin-field">
                <label className="admin-label">Size</label>
                {(attributes.SIZE?.length ?? 0) > 0 && (
                  <select className="admin-input" value={v.sizeName} onChange={(e) => updateVariant(i, { sizeName: e.target.value })}>
                    <option value="">— Chọn —</option>
                    {(attributes.SIZE ?? []).map((o) => <option key={o.id} value={o.name}>{o.name}</option>)}
                  </select>
                )}
                <input className="admin-input" value={v.sizeName} onChange={(e) => updateVariant(i, { sizeName: e.target.value })} placeholder="S, M, L, XL…" style={{ marginTop: 4 }} />
              </div>
              <div className="admin-field">
                <label className="admin-label">Kích thước</label>
                {(attributes.DIMENSION?.length ?? 0) > 0 && (
                  <select className="admin-input" value={v.dimensions} onChange={(e) => updateVariant(i, { dimensions: e.target.value })}>
                    <option value="">— Chọn —</option>
                    {(attributes.DIMENSION ?? []).map((o) => <option key={o.id} value={o.name}>{o.name}</option>)}
                  </select>
                )}
                <input className="admin-input" value={v.dimensions} onChange={(e) => updateVariant(i, { dimensions: e.target.value })} placeholder="35x40cm" style={{ marginTop: 4 }} />
              </div>
              <div className="admin-field">
                <label className="admin-label">Dung tích</label>
                {(attributes.CAPACITY?.length ?? 0) > 0 && (
                  <select className="admin-input" value={v.capacity} onChange={(e) => updateVariant(i, { capacity: e.target.value })}>
                    <option value="">— Chọn —</option>
                    {(attributes.CAPACITY ?? []).map((o) => <option key={o.id} value={o.name}>{o.name}</option>)}
                  </select>
                )}
                <input className="admin-input" value={v.capacity} onChange={(e) => updateVariant(i, { capacity: e.target.value })} placeholder="500ml" style={{ marginTop: 4 }} />
              </div>
              <div className="admin-field">
                <label className="admin-label">Giá sỉ nội bộ (VND)</label>
                <input className="admin-input" type="number" value={v.wholesalePrice} onChange={(e) => updateVariant(i, { wholesalePrice: e.target.value })} placeholder="0 = liên hệ" />
                <p className="admin-field-hint">Không hiển thị công khai · Hiển thị "Liên hệ" ngoài website</p>
              </div>
              <div className="admin-field">
                <label className="admin-label">Giá đại lý (VND)</label>
                <input className="admin-input" type="number" value={v.dealerPrice} onChange={(e) => updateVariant(i, { dealerPrice: e.target.value })} placeholder="0 = liên hệ" />
                <p className="admin-field-hint">Không hiển thị công khai</p>
              </div>
              <div className="admin-field">
                <label className="admin-label">Tồn kho</label>
                <input className="admin-input" type="number" min="0" value={v.stockQty} onChange={(e) => updateVariant(i, { stockQty: e.target.value })} />
              </div>
              <div className="admin-field">
                <label className="admin-label">Trạng thái tồn kho</label>
                <select className="admin-input" value={v.stockStatus} onChange={(e) => updateVariant(i, { stockStatus: e.target.value })}>
                  <option value="IN_STOCK">Còn hàng</option>
                  <option value="LOW_STOCK">Sắp hết</option>
                  <option value="OUT_OF_STOCK">Hết hàng</option>
                  <option value="PREORDER">Đặt trước</option>
                </select>
              </div>

              {/* Variant image */}
              <div className="admin-field">
                <label className="admin-label">Ảnh biến thể</label>
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  {v.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={v.imageUrl} alt="variant" style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 4, border: "1px solid #e5e7eb", flexShrink: 0 }} />
                  )}
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                    <MediaPicker
                      value={v.imageUrl}
                      onChange={(url) => updateVariant(i, { imageUrl: url })}
                      label="Ảnh biến thể"
                      folder="products"
                    />
                    <input className="admin-input" value={v.imageUrl} onChange={(e) => updateVariant(i, { imageUrl: e.target.value })} placeholder="URL ảnh biến thể (để trống = dùng ảnh sản phẩm)" />
                  </div>
                </div>
                <p className="admin-field-hint">Dùng ảnh sản phẩm nếu để trống</p>
              </div>

              <div className="admin-field" style={{ gridColumn: "1 / -1" }}>
                <label className="admin-label">Ghi chú nội bộ</label>
                <input className="admin-input" value={v.internalNote} onChange={(e) => updateVariant(i, { internalNote: e.target.value })} placeholder="Chỉ dành cho nội bộ ATTD" />
              </div>
            </div>
          </div>
        ))}

        <button type="button" className="admin-btn admin-btn--secondary" onClick={addVariant}>
          + Thêm biến thể
        </button>
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

      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <button type="submit" className="admin-btn admin-btn--primary" disabled={saving}>
          {saving ? "Đang lưu…" : form.id ? "Lưu thay đổi" : "Tạo sản phẩm"}
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
