"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ButtonLoading } from "@/components/ui/loading/ContextLoading";

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  border: "1px solid #d1d5db",
  borderRadius: "8px",
  fontSize: "14px",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "13px",
  fontWeight: 600,
  color: "#374151",
  marginBottom: "6px",
};

const groupStyle: React.CSSProperties = { marginBottom: "20px" };

export default function CategoryForm() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [description, setDescription] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function handleNameChange(value: string) {
    setName(value);
    setSlug(toSlug(value));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!name.trim() || !slug.trim()) {
      setError("Tên danh mục và Slug là bắt buộc.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim(),
          imageUrl: imageUrl.trim() || null,
          description: description.trim() || null,
          seoTitle: seoTitle.trim() || null,
          seoDescription: seoDescription.trim() || null,
        }),
      });

      const data: unknown = await res.json();

      if (!res.ok) {
        const msg =
          data &&
          typeof data === "object" &&
          "message" in data &&
          typeof (data as Record<string, unknown>).message === "string"
            ? (data as { message: string }).message
            : "Không thể tạo danh mục.";
        setError(msg);
        return;
      }

      setSuccess(true);
      setName("");
      setSlug("");
      setImageUrl("");
      setDescription("");
      setSeoTitle("");
      setSeoDescription("");
      router.refresh();
    } catch {
      setError("Lỗi kết nối máy chủ.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: "640px" }}>
      {/* Name */}
      <div style={groupStyle}>
        <label style={labelStyle}>
          Tên danh mục <span style={{ color: "#ef4444" }}>*</span>
        </label>
        <input
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="Ví dụ: Áo thun"
          required
          style={inputStyle}
        />
      </div>

      {/* Slug */}
      <div style={groupStyle}>
        <label style={labelStyle}>
          Slug <span style={{ color: "#ef4444" }}>*</span>
        </label>
        <input
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="ao-thun"
          required
          style={inputStyle}
        />
        <p style={{ fontSize: "12px", color: "#9ca3af", marginTop: "4px" }}>
          URL: attd.vn/{slug || "danh-muc"}
        </p>
      </div>

      {/* Image URL */}
      <div style={groupStyle}>
        <label style={labelStyle}>Image URL</label>
        <input
          type="url"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="https://..."
          style={inputStyle}
        />
      </div>

      {/* Description */}
      <div style={groupStyle}>
        <label style={labelStyle}>Mô tả danh mục</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="Giới thiệu về danh mục sản phẩm này..."
          style={{ ...inputStyle, resize: "vertical" }}
        />
      </div>

      {/* SEO */}
      <div
        style={{
          marginTop: "24px",
          paddingTop: "24px",
          borderTop: "1px solid #e5e7eb",
          marginBottom: "24px",
        }}
      >
        <h3 style={{ fontSize: "15px", fontWeight: 700, marginBottom: "4px" }}>SEO</h3>
        <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "20px" }}>
          Tối ưu hoá hiển thị trên Google.
        </p>

        <div style={groupStyle}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "6px",
            }}
          >
            <label style={{ ...labelStyle, marginBottom: 0 }}>SEO Title</label>
            <span
              style={{
                fontSize: "12px",
                color: seoTitle.length > 230 ? "#ef4444" : "#9ca3af",
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
            placeholder={`${name || "Tên danh mục"} | ATTD`}
            style={inputStyle}
          />
        </div>

        <div style={groupStyle}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "6px",
            }}
          >
            <label style={{ ...labelStyle, marginBottom: 0 }}>SEO Description</label>
            <span
              style={{
                fontSize: "12px",
                color: seoDescription.length > 460 ? "#ef4444" : "#9ca3af",
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

      {error && (
        <p
          style={{
            color: "#ef4444",
            fontSize: "14px",
            marginBottom: "16px",
            padding: "10px 14px",
            background: "#fef2f2",
            borderRadius: "8px",
          }}
        >
          {error}
        </p>
      )}

      {success && (
        <p
          style={{
            color: "#16a34a",
            fontSize: "14px",
            marginBottom: "16px",
            padding: "10px 14px",
            background: "#f0fdf4",
            borderRadius: "8px",
          }}
        >
          Đã tạo danh mục thành công.
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        style={{
          padding: "10px 24px",
          background: loading ? "#9ca3af" : "#111827",
          color: "#fff",
          border: "none",
          borderRadius: "8px",
          fontWeight: 600,
          fontSize: "14px",
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? <ButtonLoading title="Đang tạo danh mục…" tone="admin" /> : "Thêm danh mục"}
      </button>
    </form>
  );
}
