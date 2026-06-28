"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
  ALLOWED_IMAGE_EXTENSIONS,
  inferImageMimeType,
} from "@/lib/imageValidation";

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

type UploadStatus = "idle" | "uploading" | "error" | "success";

export default function ProductImageManager({ productId, images }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [altText, setAltText] = useState("");
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState("");

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!inferImageMimeType(file.name, file.type)) {
      setUploadError(
        `Định dạng không hỗ trợ. Chỉ chấp nhận: ${ALLOWED_IMAGE_EXTENSIONS.join(", ")}`
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
    setUploadSuccess("");
    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
  }

  async function handleUpload() {
    if (!selectedFile) return;
    setUploadStatus("uploading");
    setUploadError("");
    setUploadSuccess("");

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
      setUploadStatus("success");
      setUploadSuccess(`Đã tải lên thành công: ${selectedFile.name}`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      router.refresh();
    } catch {
      setUploadError("Không thể kết nối. Vui lòng thử lại.");
      setUploadStatus("error");
    }
  }

  async function runImageAction(
    id: string,
    action: "setPrimary" | "moveUp" | "moveDown" | "delete",
    successText: string
  ) {
    setBusyId(id);
    setActionMessage("");
    try {
      if (action === "delete") {
        if (!confirm("Xóa ảnh này?")) return;
        const res = await fetch(`/api/images/${id}`, { method: "DELETE" });
        if (!res.ok) {
          const data = await res.json();
          setActionMessage(data.message ?? "Xóa thất bại");
          return;
        }
      } else {
        const res = await fetch(`/api/images/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });
        if (!res.ok) {
          const data = await res.json();
          setActionMessage(data.message ?? "Thao tác thất bại");
          return;
        }
      }
      setActionMessage(successText);
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="admin-panel">
      <div className="admin-form admin-form--wide">
        <h3 className="admin-subtitle">Thêm hình ảnh</h3>

        <div className="admin-form-group">
          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_IMAGE_EXTENSIONS.join(",")}
            onChange={handleFileChange}
            className="admin-input"
          />
          <p className="admin-field-hint">JPG, PNG, WebP · Tối đa 4 MB</p>
        </div>

        {uploadError && (
          <p className="admin-message admin-message--error">{uploadError}</p>
        )}
        {uploadSuccess && (
          <p className="admin-message admin-message--success">{uploadSuccess}</p>
        )}

        {preview && (
          <div className="admin-media-preview admin-media-preview--sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Preview" />
          </div>
        )}

        {selectedFile && (
          <>
            <div className="admin-form-group">
              <label htmlFor="altText">Alt text (tùy chọn)</label>
              <input
                id="altText"
                type="text"
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                placeholder="Mô tả ảnh — hỗ trợ SEO"
                className="admin-input"
              />
            </div>
            <button
              type="button"
              onClick={handleUpload}
              disabled={uploadStatus === "uploading"}
              className="admin-btn admin-btn--primary"
            >
              {uploadStatus === "uploading" ? "Đang tải lên..." : "Tải lên"}
            </button>
          </>
        )}
      </div>

      <div style={{ marginTop: 32 }}>
        <h3 className="admin-subtitle">Hình ảnh ({images.length})</h3>
        <p className="admin-field-hint" style={{ marginBottom: 12 }}>
          Ảnh thứ hai sẽ hiển thị khi rê chuột vào card sản phẩm trên desktop.
        </p>

        {actionMessage && (
          <p className="admin-message admin-message--info">{actionMessage}</p>
        )}

        {images.length === 0 ? (
          <div className="admin-empty-state">
            <p>Chưa có hình ảnh nào.</p>
            <p className="admin-empty-hint">Tải ảnh lên để hiển thị trên trang sản phẩm.</p>
          </div>
        ) : (
          images.map((image, index) => (
            <div
              key={image.id}
              className="admin-image-row"
              style={{ opacity: busyId === image.id ? 0.5 : 1 }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.imageUrl}
                alt={image.altText ?? ""}
                className={`admin-thumb admin-thumb--lg${index === 0 ? " admin-thumb--primary" : ""}`}
              />

              <div className="admin-image-row-meta">
                {index === 0 && (
                  <span className="admin-badge admin-badge--success">Ảnh chính</span>
                )}
                <div className="admin-image-row-url">
                  {image.imageUrl.split("/").pop()}
                </div>
                {image.altText && (
                  <div className="admin-image-row-alt">{image.altText}</div>
                )}
              </div>

              <div className="admin-image-row-actions">
                {index > 0 && (
                  <button
                    type="button"
                    disabled={busyId !== null}
                    className="admin-btn admin-btn--sm"
                    onClick={() => runImageAction(image.id, "moveUp", "Đã di chuyển lên")}
                  >
                    ↑
                  </button>
                )}
                {index < images.length - 1 && (
                  <button
                    type="button"
                    disabled={busyId !== null}
                    className="admin-btn admin-btn--sm"
                    onClick={() => runImageAction(image.id, "moveDown", "Đã di chuyển xuống")}
                  >
                    ↓
                  </button>
                )}
                {index !== 0 && (
                  <button
                    type="button"
                    disabled={busyId !== null}
                    className="admin-btn admin-btn--sm"
                    onClick={() =>
                      runImageAction(image.id, "setPrimary", "Đã đặt làm ảnh chính")
                    }
                  >
                    Ảnh chính
                  </button>
                )}
                <button
                  type="button"
                  disabled={busyId !== null}
                  className="admin-btn admin-btn--sm admin-btn--danger"
                  onClick={() => runImageAction(image.id, "delete", "Đã xóa ảnh")}
                >
                  Xóa
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
