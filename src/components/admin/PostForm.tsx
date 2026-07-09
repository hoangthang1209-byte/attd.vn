"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ButtonLoading } from "@/components/ui/loading/ContextLoading";

type PostData = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  imageUrl: string | null;
  status: string;
  seoTitle: string | null;
  seoDescription: string | null;
};

type Props =
  | { mode: "create" }
  | { mode: "edit"; post: PostData };

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
  background: "#fff",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "13px",
  fontWeight: 600,
  color: "#374151",
  marginBottom: "6px",
};

const groupStyle: React.CSSProperties = { marginBottom: "20px" };

const STATUS_OPTIONS = [
  { value: "DRAFT", label: "Nháp" },
  { value: "PUBLISHED", label: "Đã xuất bản" },
] as const;

export default function PostForm(props: Props) {
  const router = useRouter();
  const isEdit = props.mode === "edit";
  const initial = isEdit ? props.post : null;

  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(isEdit);
  const [excerpt, setExcerpt] = useState(initial?.excerpt ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? "");
  const [status, setStatus] = useState(initial?.status ?? "DRAFT");
  const [seoTitle, setSeoTitle] = useState(initial?.seoTitle ?? "");
  const [seoDescription, setSeoDescription] = useState(
    initial?.seoDescription ?? ""
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function handleTitleChange(value: string) {
    setTitle(value);
    if (!slugEdited) setSlug(toSlug(value));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!title.trim()) {
      setError("Tiêu đề bài viết là bắt buộc.");
      return;
    }
    if (!slug.trim()) {
      setError("Slug là bắt buộc.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        title: title.trim(),
        slug: slug.trim(),
        excerpt: excerpt.trim() || null,
        content: content.trim() || null,
        imageUrl: imageUrl.trim() || null,
        status,
        seoTitle: seoTitle.trim() || null,
        seoDescription: seoDescription.trim() || null,
      };

      const url = isEdit
        ? `/api/posts/${(props as { mode: "edit"; post: PostData }).post.id}`
        : "/api/posts";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data: unknown = await res.json();

      if (!res.ok) {
        const msg =
          data &&
          typeof data === "object" &&
          "message" in data &&
          typeof (data as { message: unknown }).message === "string"
            ? (data as { message: string }).message
            : "Đã xảy ra lỗi.";
        setError(msg);
        return;
      }

      setSuccess(true);

      if (!isEdit) {
        setTitle("");
        setSlug("");
        setSlugEdited(false);
        setExcerpt("");
        setContent("");
        setImageUrl("");
        setStatus("DRAFT");
        setSeoTitle("");
        setSeoDescription("");
      }

      router.refresh();
    } catch {
      setError("Lỗi kết nối máy chủ.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: "760px" }}>
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
          {isEdit ? "Đã lưu thay đổi." : "Đã tạo bài viết."}
        </div>
      )}

      {/* Title */}
      <div style={groupStyle}>
        <label style={labelStyle}>
          Tiêu đề <span style={{ color: "#ef4444" }}>*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Ví dụ: Cách chọn đồng phục cho doanh nghiệp"
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
          type="text"
          value={slug}
          onChange={(e) => {
            setSlug(e.target.value);
            setSlugEdited(true);
          }}
          required
          style={inputStyle}
        />
        <p style={{ fontSize: "12px", color: "#9ca3af", marginTop: "4px" }}>
          URL: attd.vn/blog/{slug || "slug-bai-viet"}
        </p>
      </div>

      {/* Status */}
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

      {/* Image URL */}
      <div style={groupStyle}>
        <label style={labelStyle}>Ảnh bìa (URL)</label>
        <input
          type="url"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="https://..."
          style={inputStyle}
        />
      </div>

      {/* Excerpt */}
      <div style={groupStyle}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: "6px",
          }}
        >
          <label style={{ ...labelStyle, marginBottom: 0 }}>Tóm tắt</label>
          <span
            style={{
              fontSize: "12px",
              color: excerpt.length > 280 ? "#ef4444" : "#9ca3af",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {excerpt.length} / 300
          </span>
        </div>
        <textarea
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          rows={3}
          placeholder="Mô tả ngắn hiển thị trên trang danh sách blog"
          style={{ ...inputStyle, resize: "vertical" }}
        />
      </div>

      {/* Content */}
      <div style={groupStyle}>
        <label style={labelStyle}>Nội dung bài viết</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={16}
          placeholder="Nhập nội dung bài viết..."
          style={{ ...inputStyle, resize: "vertical", lineHeight: "1.6" }}
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
        <h3
          style={{
            fontSize: "15px",
            fontWeight: 700,
            marginBottom: "4px",
            color: "#111827",
          }}
        >
          SEO
        </h3>
        <p
          style={{
            fontSize: "13px",
            color: "#6b7280",
            marginBottom: "20px",
          }}
        >
          Tối ưu hoá hiển thị trên Google.
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
                color: seoTitle.length > 230 ? "#ef4444" : "#9ca3af",
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
            placeholder={`${title || "Tiêu đề bài viết"} | ATTD`}
            style={inputStyle}
          />
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
                color: seoDescription.length > 460 ? "#ef4444" : "#9ca3af",
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

      <button
        type="submit"
        disabled={saving}
        style={{
          padding: "10px 28px",
          background: saving ? "#9ca3af" : "#111827",
          color: "#fff",
          border: "none",
          borderRadius: "8px",
          fontWeight: 600,
          fontSize: "14px",
          cursor: saving ? "not-allowed" : "pointer",
        }}
      >
        {saving ? (
          <ButtonLoading title="Đang lưu bài viết…" tone="admin" />
        ) : isEdit ? (
          "Lưu thay đổi"
        ) : (
          "Tạo bài viết"
        )}
      </button>
    </form>
  );
}
