"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];
const MAX_SIZE = 4 * 1024 * 1024;

type ProductImage = {
  id: string;
  imageUrl: string;
  altText: string | null;
  sortOrder: number;
};

type Props = {
  productId: string;
  images: ProductImage[];
};

type UploadStatus = "idle" | "uploading" | "error";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  border: "1px solid #e5e7eb",
  borderRadius: "8px",
  fontSize: "14px",
  background: "#fff",
  boxSizing: "border-box",
};

const btnStyle: React.CSSProperties = {
  padding: "8px 16px",
  borderRadius: "8px",
  border: "1px solid #e5e7eb",
  background: "#fff",
  fontSize: "13px",
  cursor: "pointer",
};

export default function ProductImageManager({ productId, images }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [altText, setAltText] = useState("");
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [uploadError, setUploadError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setUploadError(
        `Định dạng không hỗ trợ. Chỉ chấp nhận: ${ALLOWED_EXTENSIONS.join(", ")}`
      );
      setSelectedFile(null);
      setPreview(null);
      return;
    }

    if (file.size > MAX_SIZE) {
      setUploadError(
        `File quá lớn (${(file.size / 1024 / 1024).toFixed(1)} MB). Tối đa 4 MB.`
      );
      setSelectedFile(null);
      setPreview(null);
      return;
    }

    setUploadError("");
    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
  }

  async function handleUpload() {
    if (!selectedFile) return;
    setUploadStatus("uploading");
    setUploadError("");

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("productId", productId);
    if (altText.trim()) formData.append("altText", altText.trim());

    try {
      const response = await fetch("/api/images", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (!response.ok) {
        setUploadError(data.message ?? "Có lỗi xảy ra. Vui lòng thử lại.");
        setUploadStatus("error");
        return;
      }

      setSelectedFile(null);
      setPreview(null);
      setAltText("");
      setUploadStatus("idle");
      if (fileInputRef.current) fileInputRef.current.value = "";
      router.refresh();
    } catch {
      setUploadError("Không thể kết nối. Vui lòng thử lại.");
      setUploadStatus("error");
    }
  }

  async function handleSetPrimary(id: string) {
    setBusyId(id);
    try {
      await fetch(`/api/images/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setPrimary" }),
      });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Xóa ảnh này?")) return;
    setBusyId(id);
    try {
      await fetch(`/api/images/${id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      {/* Upload form */}
      <div
        style={{
          padding: "24px",
          border: "1px solid #e5e7eb",
          borderRadius: "12px",
          marginBottom: "32px",
          background: "#fafafa",
        }}
      >
        <h3 style={{ margin: "0 0 16px", fontSize: "16px" }}>Thêm hình ảnh</h3>

        <div style={{ marginBottom: "12px" }}>
          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_EXTENSIONS.join(",")}
            onChange={handleFileChange}
            style={{ fontSize: "14px" }}
          />
          <div style={{ marginTop: "4px", fontSize: "12px", color: "#9ca3af" }}>
            JPG, PNG, WebP · Tối đa 4 MB
          </div>
        </div>

        {uploadError && (
          <div
            style={{
              marginBottom: "12px",
              padding: "10px 14px",
              background: "#fee2e2",
              border: "1px solid #fecaca",
              borderRadius: "8px",
              color: "#dc2626",
              fontSize: "13px",
            }}
          >
            {uploadError}
          </div>
        )}

        {preview && (
          <div style={{ marginBottom: "12px" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Preview"
              style={{
                width: "100px",
                height: "100px",
                objectFit: "cover",
                borderRadius: "8px",
                border: "1px solid #e5e7eb",
              }}
            />
          </div>
        )}

        {selectedFile && (
          <>
            <div style={{ marginBottom: "12px" }}>
              <input
                type="text"
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                placeholder="Alt text (tùy chọn — hỗ trợ SEO)"
                style={inputStyle}
              />
            </div>
            <button
              onClick={handleUpload}
              disabled={uploadStatus === "uploading"}
              style={{
                ...btnStyle,
                background: "var(--primary)",
                color: "#fff",
                border: "none",
                opacity: uploadStatus === "uploading" ? 0.7 : 1,
              }}
            >
              {uploadStatus === "uploading" ? "Đang tải lên..." : "Tải lên"}
            </button>
          </>
        )}
      </div>

      {/* Image list */}
      <div>
        <h3 style={{ margin: "0 0 16px", fontSize: "16px" }}>
          Hình ảnh ({images.length})
        </h3>

        {images.length === 0 && (
          <p style={{ color: "#9ca3af", fontSize: "14px" }}>
            Chưa có hình ảnh nào.
          </p>
        )}

        {images.map((image, index) => (
          <div
            key={image.id}
            style={{
              display: "flex",
              gap: "16px",
              alignItems: "center",
              padding: "16px 0",
              borderBottom: "1px solid #e5e7eb",
              opacity: busyId === image.id ? 0.5 : 1,
            }}
          >
            {/* Thumbnail — plain img for admin (no next/image optimization needed) */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.imageUrl}
              alt={image.altText ?? ""}
              style={{
                width: "80px",
                height: "80px",
                objectFit: "cover",
                borderRadius: "8px",
                border:
                  index === 0
                    ? "2px solid var(--primary)"
                    : "1px solid #e5e7eb",
                flexShrink: 0,
              }}
            />

            <div style={{ flex: 1, minWidth: 0 }}>
              {index === 0 && (
                <span
                  style={{
                    display: "inline-block",
                    padding: "2px 8px",
                    background: "#dcfce7",
                    color: "#16a34a",
                    fontSize: "11px",
                    fontWeight: 600,
                    borderRadius: "4px",
                    marginBottom: "4px",
                  }}
                >
                  Ảnh chính
                </span>
              )}
              <div
                style={{
                  fontSize: "12px",
                  color: "#6b7280",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {image.imageUrl.split("/").pop()}
              </div>
              {image.altText && (
                <div style={{ fontSize: "12px", color: "#374151", marginTop: "2px" }}>
                  {image.altText}
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
              {index !== 0 && (
                <button
                  onClick={() => handleSetPrimary(image.id)}
                  disabled={busyId !== null}
                  style={btnStyle}
                >
                  Đặt làm ảnh chính
                </button>
              )}
              <button
                onClick={() => handleDelete(image.id)}
                disabled={busyId !== null}
                style={{ ...btnStyle, color: "#dc2626" }}
              >
                Xóa
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
