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
  skuPreview: string;
  skuTaken: boolean;
};

type ProductFormData = {
  id?: string;
  name: string;
  productCode: string;
  categoryId: string;
  shortDescription: string;
  description: string;
  material: string;
  form: string;
  fit: string;
  defaultMoq: string;
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
  internalNote: "", skuPreview: "", skuTaken: false,
});

type Props = {
  initialData?: Partial<ProductFormData> & { id?: string };
  categories?: Category[];
};

type AttrMap = Record<string, AttributeOption[]>;

export default function ProductCatalogForm({ initialData, categories: propCategories }: Props) {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>(propCategories ?? []);
  const [attributes, setAttributes] = useState<AttrMap>({});
  const [form, setForm] = useState<ProductFormData>({
    id: initialData?.id,
    name: initialData?.name ?? "",
    productCode: initialData?.productCode ?? "",
    categoryId: initialData?.categoryId ?? "",
    shortDescription: initialData?.shortDescription ?? "",
    description: initialData?.description ?? "",
    material: initialData?.material ?? "",
    form: initialData?.form ?? "",
    fit: initialData?.fit ?? "",
    defaultMoq: initialData?.defaultMoq ?? "",
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

  async function previewSku(index: number) {
    const v = form.variants[index];
    if (!form.categoryId && !form.productCode && !form.name) return;
    try {
      const res = await fetch("/api/admin/products/sku-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: form.categoryId,
          productName: form.name,
          productCode: form.productCode || undefined,
          material: form.material || undefined,
          colorName: v.colorName || undefined,
          colorCode: v.colorCode || undefined,
          sizeName: v.sizeName || undefined,
          dimensions: v.dimensions || undefined,
          capacity: v.capacity || undefined,
          excludeVariantId: v.id,
        }),
      });
      const data = await res.json() as { sku: string; isTaken: boolean };
      updateVariant(index, { skuPreview: data.sku, skuTaken: data.isTaken });
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError("Tên sản phẩm là bắt buộc."); return; }
    if (!form.categoryId) { setError("Vui lòng chọn danh mục."); return; }
    setError(null);
    setSaving(true);

    const payload = {
      name: form.name.trim(),
      productCode: form.productCode.trim() || undefined,
      categoryId: form.categoryId,
      shortDescription: form.shortDescription.trim() || undefined,
      description: form.description.trim() || undefined,
      material: form.material.trim() || undefined,
      form: form.form.trim() || undefined,
      fit: form.fit.trim() || undefined,
      defaultMoq: form.defaultMoq ? Number(form.defaultMoq) : undefined,
      useCases: form.useCases.split(",").map((s) => s.trim()).filter(Boolean),
      targetCustomers: form.targetCustomers.split(",").map((s) => s.trim()).filter(Boolean),
      supportsPrinting: form.supportsPrinting,
      supportsEmbroidery: form.supportsEmbroidery,
      supportsOem: form.supportsOem,
      tags: form.tags.split(",").map((s) => s.trim()).filter(Boolean),
      status: form.status,
      featuredImage: form.featuredImage || undefined,
      gallery: form.gallery.filter(Boolean),
      variants: form.variants.map((v) => ({
        id: v.id,
        colorName: v.colorName.trim() || undefined,
        colorCode: v.colorCode.trim() || undefined,
        sizeName: v.sizeName.trim() || undefined,
        dimensions: v.dimensions.trim() || undefined,
        capacity: v.capacity.trim() || undefined,
        wholesalePrice: v.wholesalePrice ? Number(v.wholesalePrice) : undefined,
        dealerPrice: v.dealerPrice ? Number(v.dealerPrice) : undefined,
        stockQty: Number(v.stockQty) || 0,
        stockStatus: v.stockStatus,
        internalNote: v.internalNote.trim() || undefined,
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
      const data = await res.json() as { id?: string; message?: string };
      if (!res.ok) throw new Error(data.message ?? "Lỗi lưu sản phẩm.");
      router.push("/admin/products");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi lưu sản phẩm.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="admin-catalog-form" onSubmit={(e) => void handleSubmit(e)}>
      <h2 className="admin-subtitle">{form.id ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm mới"}</h2>

      {/* Basic info */}
      <fieldset className="admin-catalog-fieldset">
        <legend>Thông tin cơ bản</legend>
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
            <label className="admin-label">Mã sản phẩm</label>
            <input className="admin-input" value={form.productCode} onChange={(e) => setField("productCode", e.target.value)} placeholder="CVC-BASIC (tự động nếu để trống)" />
          </div>
          <div className="admin-field">
            <label className="admin-label">Chất liệu</label>
            {(attributes.MATERIAL?.length ?? 0) > 0 && (
              <select className="admin-input" value={form.material} onChange={(e) => setField("material", e.target.value)} style={{ marginBottom: 4 }}>
                <option value="">— Chọn —</option>
                {(attributes.MATERIAL ?? []).map((o) => <option key={o.id} value={o.name}>{o.name}</option>)}
              </select>
            )}
            <input className="admin-input" value={form.material} onChange={(e) => setField("material", e.target.value)} placeholder="CVC, Cotton 100%, Polyester pique… (nhập thủ công)" />
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
            <label className="admin-label">MOQ mặc định (cái)</label>
            <input className="admin-input" type="number" min="1" value={form.defaultMoq} onChange={(e) => setField("defaultMoq", e.target.value)} placeholder="50" />
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
        <div className="admin-field">
          <label className="admin-label">Ứng dụng B2B (cách nhau bởi dấu phẩy)</label>
          <input className="admin-input" value={form.useCases} onChange={(e) => setField("useCases", e.target.value)} placeholder="Xưởng in, Đồng phục công ty, Đại lý sỉ" />
        </div>
        <div className="admin-field">
          <label className="admin-label">Đối tượng phù hợp (cách nhau bởi dấu phẩy)</label>
          <input className="admin-input" value={form.targetCustomers} onChange={(e) => setField("targetCustomers", e.target.value)} placeholder="Đại lý sỉ, Doanh nghiệp, Agency" />
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

      {/* Featured image + gallery */}
      <fieldset className="admin-catalog-fieldset">
        <legend>Hình ảnh sản phẩm</legend>
        <p className="admin-field-hint">Ảnh nên tối ưu 200–300KB trước khi upload để website tải nhanh.</p>

        <div className="admin-field">
          <label className="admin-label">Ảnh đại diện</label>
          <MediaPicker
            label="Ảnh đại diện"
            value={form.featuredImage}
            onChange={(url) => setField("featuredImage", url)}
            folder="products"
          />
          <p className="admin-field-hint">Hoặc nhập URL ảnh trực tiếp:</p>
          <input
            className="admin-input"
            value={form.featuredImage}
            onChange={(e) => setField("featuredImage", e.target.value)}
            placeholder="https://… hoặc chọn từ thư viện ảnh phía trên"
          />
        </div>

        <div className="admin-field">
          <label className="admin-label">Thư viện ảnh (gallery)</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {form.gallery.map((url, idx) => (
              <div key={idx} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                {url && <img src={url} alt="" style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 4, border: "1px solid #e5e7eb" }} />}
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
                <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" onClick={() => setField("gallery", form.gallery.filter((_, i) => i !== idx))}>✕</button>
              </div>
            ))}
            <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" style={{ alignSelf: "flex-start" }} onClick={() => setField("gallery", [...form.gallery, ""])}>
              + Thêm ảnh gallery
            </button>
          </div>
        </div>
      </fieldset>

      {/* Variants */}
      <fieldset className="admin-catalog-fieldset">
        <legend>Biến thể / SKU</legend>
        <p className="admin-field-hint">Nhấn "Xem SKU" để xem SKU được tạo tự động trước khi lưu.</p>

        {form.variants.map((v, i) => (
          <div key={i} className="admin-catalog-variant-row">
            <div className="admin-catalog-variant-header">
              <strong>Biến thể #{i + 1}</strong>
              {v.skuPreview && (
                <code className={`admin-catalog-code ${v.skuTaken ? "is-taken" : "is-ok"}`}>
                  {v.skuPreview} {v.skuTaken ? "⚠ Đã tồn tại" : "✓"}
                </code>
              )}
              <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" onClick={() => void previewSku(i)}>Xem SKU</button>
              {form.variants.length > 1 && (
                <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" onClick={() => removeVariant(i)}>Xóa</button>
              )}
            </div>
            <div className="admin-catalog-variant-fields">
              <div className="admin-field">
                <label className="admin-label">Màu sắc</label>
                {(attributes.COLOR?.length ?? 0) > 0 ? (
                  <select className="admin-input" value={v.colorName} onChange={(e) => {
                    const opt = attributes.COLOR?.find((o) => o.name === e.target.value);
                    updateVariant(i, { colorName: e.target.value, colorCode: opt?.code ?? v.colorCode });
                  }}>
                    <option value="">— Chọn hoặc nhập thủ công —</option>
                    {(attributes.COLOR ?? []).map((o) => <option key={o.id} value={o.name}>{o.name} ({o.code})</option>)}
                  </select>
                ) : null}
                <input className="admin-input" value={v.colorName} onChange={(e) => updateVariant(i, { colorName: e.target.value })} placeholder="Đen, Trắng, Xanh navy… (nhập thủ công)" style={{ marginTop: 4 }} />
              </div>
              <div className="admin-field">
                <label className="admin-label">Mã màu</label>
                <input className="admin-input" value={v.colorCode} onChange={(e) => updateVariant(i, { colorCode: e.target.value })} placeholder="BLK, WHT, NVY…" />
                <p className="admin-field-hint">SKU sử dụng mã màu này. Chuẩn: BLK, WHT, NVY…</p>
              </div>
              <div className="admin-field">
                <label className="admin-label">Size</label>
                {(attributes.SIZE?.length ?? 0) > 0 ? (
                  <select className="admin-input" value={v.sizeName} onChange={(e) => updateVariant(i, { sizeName: e.target.value })}>
                    <option value="">— Chọn hoặc nhập thủ công —</option>
                    {(attributes.SIZE ?? []).map((o) => <option key={o.id} value={o.name}>{o.name}</option>)}
                  </select>
                ) : null}
                <input className="admin-input" value={v.sizeName} onChange={(e) => updateVariant(i, { sizeName: e.target.value })} placeholder="S, M, L, XL, OneSize…" style={{ marginTop: 4 }} />
              </div>
              <div className="admin-field">
                <label className="admin-label">Kích thước</label>
                {(attributes.DIMENSION?.length ?? 0) > 0 ? (
                  <select className="admin-input" value={v.dimensions} onChange={(e) => updateVariant(i, { dimensions: e.target.value })}>
                    <option value="">— Chọn hoặc nhập thủ công —</option>
                    {(attributes.DIMENSION ?? []).map((o) => <option key={o.id} value={o.name}>{o.name}</option>)}
                  </select>
                ) : null}
                <input className="admin-input" value={v.dimensions} onChange={(e) => updateVariant(i, { dimensions: e.target.value })} placeholder="35x40cm" style={{ marginTop: 4 }} />
              </div>
              <div className="admin-field">
                <label className="admin-label">Dung tích</label>
                {(attributes.CAPACITY?.length ?? 0) > 0 ? (
                  <select className="admin-input" value={v.capacity} onChange={(e) => updateVariant(i, { capacity: e.target.value })}>
                    <option value="">— Chọn hoặc nhập thủ công —</option>
                    {(attributes.CAPACITY ?? []).map((o) => <option key={o.id} value={o.name}>{o.name}</option>)}
                  </select>
                ) : null}
                <input className="admin-input" value={v.capacity} onChange={(e) => updateVariant(i, { capacity: e.target.value })} placeholder="500ml" style={{ marginTop: 4 }} />
              </div>
              <div className="admin-field">
                <label className="admin-label">Giá sỉ (VND)</label>
                <input className="admin-input" type="number" value={v.wholesalePrice} onChange={(e) => updateVariant(i, { wholesalePrice: e.target.value })} placeholder="0 = liên hệ" />
              </div>
              <div className="admin-field">
                <label className="admin-label">Giá đại lý (VND)</label>
                <input className="admin-input" type="number" value={v.dealerPrice} onChange={(e) => updateVariant(i, { dealerPrice: e.target.value })} placeholder="0 = liên hệ" />
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

      {error && <p className="admin-error">{error}</p>}

      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <button type="submit" className="admin-btn admin-btn--primary" disabled={saving}>
          {saving ? "Đang lưu…" : form.id ? "Lưu thay đổi" : "Tạo sản phẩm"}
        </button>
        <button type="button" className="admin-btn admin-btn--secondary" onClick={() => router.push("/admin/products")}>
          Hủy
        </button>
      </div>
    </form>
  );
}
