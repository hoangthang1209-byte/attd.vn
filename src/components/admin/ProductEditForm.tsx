"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ButtonLoading } from "@/components/ui/loading/ContextLoading";

type Category = {
  id: string;
  name: string;
};

type ProductData = {
  id: string;
  name: string;
  slug: string;
  productCode: string | null;
  categoryId: string;
  status: string;
  shortDescription: string | null;
  description: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
};

type Props = {
  product: ProductData;
  categories: Category[];
};

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Đang bán" },
  { value: "DRAFT", label: "Nháp" },
  { value: "ARCHIVED", label: "Đã ẩn" },
] as const;

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replaceAll("đ", "d")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  border: "1px solid #e5e7eb",
  borderRadius: "8px",
  fontSize: "14px",
  background: "#fff",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "13px",
  fontWeight: 600,
  color: "#374151",
  marginBottom: "6px",
};

const groupStyle: React.CSSProperties = {
  marginBottom: "20px",
};

export default function ProductEditForm({ product, categories }: Props) {
  const router = useRouter();

  const [name, setName] = useState(product.name);
  const [slug, setSlug] = useState(product.slug);
  const [slugEdited, setSlugEdited] = useState(false);
  const [productCode, setProductCode] = useState(product.productCode ?? "");
  const [categoryId, setCategoryId] = useState(product.categoryId);
  const [status, setStatus] = useState(product.status);
  const [shortDescription, setShortDescription] = useState(
    product.shortDescription ?? ""
  );
  const [description, setDescription] = useState(product.description ?? "");
  const [seoTitle, setSeoTitle] = useState(product.seoTitle ?? "");
  const [seoDescription, setSeoDescription] = useState(
    product.seoDescription ?? ""
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setName(val);
    if (!slugEdited) setSlug(toSlug(val));
  }

  function handleSlugChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSlug(e.target.value);
    setSlugEdited(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!name.trim()) {
      setError("Tên sản phẩm là bắt buộc");
      return;
    }
    if (!slug.trim()) {
      setError("Slug là bắt buộc");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim(),
          productCode: productCode.trim() || null,
          categoryId,
          status,
          shortDescription: shortDescription.trim() || null,
          description: description.trim() || null,
          seoTitle: seoTitle.trim() || null,
          seoDescription: seoDescription.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message ?? "Có lỗi xảy ra. Vui lòng thử lại.");
        return;
      }

      setSuccess(true);
      router.refresh();
    } catch {
      setError("Không thể kết nối. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {success && (
        <div
          style={{
            marginBottom: "20px",
            padding: "12px 16px",
            background: "#dcfce7",
            border: "1px solid #bbf7d0",
            borderRadius: "8px",
            color: "#16a34a",
            fontSize: "14px",
            fontWeight: 500,
          }}
        >
          Đã lưu thay đổi thành công.
        </div>
      )}

      {error && (
        <div
          style={{
            marginBottom: "20px",
            padding: "12px 16px",
            background: "#fee2e2",
            border: "1px solid #fecaca",
            borderRadius: "8px",
            color: "#dc2626",
            fontSize: "14px",
          }}
        >
          {error}
        </div>
      )}

      <div style={groupStyle}>
        <label style={labelStyle}>
          Tên sản phẩm <span style={{ color: "#dc2626" }}>*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={handleNameChange}
          required
          style={inputStyle}
        />
      </div>

      <div style={groupStyle}>
        <label style={labelStyle}>
          Slug <span style={{ color: "#dc2626" }}>*</span>
        </label>
        <input
          type="text"
          value={slug}
          onChange={handleSlugChange}
          required
          style={inputStyle}
        />
        <div style={{ fontSize: "12px", color: "#9ca3af", marginTop: "4px" }}>
          URL công khai: /san-pham/{slug || "…"}
        </div>
      </div>

      <div style={groupStyle}>
        <label style={labelStyle}>Mã sản phẩm</label>
        <input
          type="text"
          value={productCode}
          onChange={(e) => setProductCode(e.target.value)}
          style={inputStyle}
        />
      </div>

      <div style={groupStyle}>
        <label style={labelStyle}>
          Danh mục <span style={{ color: "#dc2626" }}>*</span>
        </label>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          style={inputStyle}
        >
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      <div style={groupStyle}>
        <label style={labelStyle}>Trạng thái</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          style={inputStyle}
        >
          {STATUS_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div style={groupStyle}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: "6px",
          }}
        >
          <label style={{ ...labelStyle, marginBottom: 0 }}>Mô tả ngắn</label>
          <span
            style={{
              fontSize: "12px",
              color: shortDescription.length > 280 ? "#dc2626" : "#9ca3af",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {shortDescription.length} / 300
          </span>
        </div>
        <textarea
          value={shortDescription}
          onChange={(e) => setShortDescription(e.target.value)}
          rows={3}
          placeholder="Mô tả ngắn hiển thị dưới tên sản phẩm và dùng làm meta description dự phòng"
          style={{ ...inputStyle, resize: "vertical" }}
        />
        <div style={{ fontSize: "12px", color: "#9ca3af", marginTop: "4px" }}>
          Dùng cho mô tả ngắn và meta description. Gợi ý: dưới 300 ký tự.
        </div>
      </div>

      <div style={groupStyle}>
        <label style={labelStyle}>Mô tả chi tiết</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={8}
          style={{ ...inputStyle, resize: "vertical" }}
        />
      </div>

      {/* SEO ──────────────────────────────────────────────────────────────── */}
      <div
        style={{
          margin: "32px 0 24px",
          paddingTop: "24px",
          borderTop: "1px solid #e5e7eb",
        }}
      >
        <h3
          style={{
            margin: "0 0 4px",
            fontSize: "15px",
            fontWeight: 700,
            color: "#111827",
          }}
        >
          SEO
        </h3>
        <p style={{ margin: "0 0 20px", fontSize: "13px", color: "#9ca3af" }}>
          Tối ưu hoá hiển thị trên Google và mạng xã hội.
        </p>

        <div style={groupStyle}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginBottom: "6px",
            }}
          >
            <label style={{ ...labelStyle, marginBottom: 0 }}>SEO Title</label>
            <span
              style={{
                fontSize: "12px",
                color: seoTitle.length > 255 ? "#dc2626" : "#9ca3af",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {seoTitle.length} / 255
            </span>
          </div>
          <input
            type="text"
            value={seoTitle}
            onChange={(e) => setSeoTitle(e.target.value)}
            maxLength={255}
            placeholder={`${product.name} | ATTD`}
            style={inputStyle}
          />
          <div style={{ fontSize: "12px", color: "#9ca3af", marginTop: "4px" }}>
            Nếu để trống, hệ thống dùng: {product.name} | ATTD
          </div>
        </div>

        <div style={groupStyle}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginBottom: "6px",
            }}
          >
            <label style={{ ...labelStyle, marginBottom: 0 }}>
              SEO Description
            </label>
            <span
              style={{
                fontSize: "12px",
                color: seoDescription.length > 500 ? "#dc2626" : "#9ca3af",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {seoDescription.length} / 500
            </span>
          </div>
          <textarea
            value={seoDescription}
            onChange={(e) => setSeoDescription(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Mô tả ngắn hiển thị trên Google (tối đa 500 ký tự)"
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </div>
      </div>

      <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
        <button
          type="submit"
          disabled={saving}
          style={{
            padding: "10px 28px",
            background: "var(--primary)",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            fontWeight: 600,
            fontSize: "14px",
            cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? <ButtonLoading title="Đang lưu sản phẩm…" tone="admin" /> : "Lưu thay đổi"}
        </button>
      </div>
    </form>
  );
}
