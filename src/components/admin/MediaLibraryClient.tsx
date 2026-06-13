"use client";

import { useCallback, useEffect, useState } from "react";
import type { MediaAsset } from "@prisma/client";
import { MEDIA_TO_STORAGE_FOLDER } from "@/lib/storage/types";
import {
  ALLOWED_IMAGE_EXTENSIONS,
  inferImageMimeType,
} from "@/lib/imageValidation";

const FOLDERS = [
  { value: "", label: "Tất cả" },
  { value: "products", label: "Products" },
  { value: "categories", label: "Categories" },
  { value: "clients", label: "Clients" },
  { value: "case-studies", label: "Case studies" },
];

type Message = { text: string; type: "success" | "error" | "info" };

export default function MediaLibraryClient({ cmsReady = true }: { cmsReady?: boolean }) {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [folder, setFolder] = useState("");
  const [search, setSearch] = useState("");
  const [uploadFolder, setUploadFolder] = useState("clients");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (folder) params.set("folder", folder);
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`/api/media?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        setMessage({
          type: "error",
          text: data.message ?? "Không thể tải thư viện ảnh",
        });
        setAssets([]);
      } else {
        setAssets(Array.isArray(data) ? data : []);
      }
    } catch {
      setMessage({ type: "error", text: "Không thể kết nối máy chủ" });
      setAssets([]);
    } finally {
      setLoading(false);
    }
  }, [folder, search]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const mimeType = inferImageMimeType(file.name, file.type);
    if (!mimeType) {
      setMessage({
        type: "error",
        text: `Định dạng không hỗ trợ. Chỉ chấp nhận: ${ALLOWED_IMAGE_EXTENSIONS.join(", ")}`,
      });
      e.target.value = "";
      return;
    }

    setUploading(true);
    setMessage(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", uploadFolder);

    try {
      const res = await fetch("/api/media", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.message ?? "Upload thất bại" });
        return;
      }
      setMessage({ type: "success", text: `Đã tải lên: ${file.name}` });
      await load();
    } catch {
      setMessage({ type: "error", text: "Không thể kết nối máy chủ" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleDelete(id: string, filename: string) {
    if (!confirm(`Xóa ảnh "${filename}"?`)) return;
    const res = await fetch(`/api/media/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      setMessage({ type: "error", text: data.message ?? "Xóa thất bại" });
      return;
    }
    setMessage({ type: "success", text: "Đã xóa ảnh" });
    await load();
  }

  async function copyUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setMessage({ type: "info", text: "Đã copy URL vào clipboard" });
    } catch {
      setMessage({ type: "error", text: "Không thể copy URL" });
    }
  }

  return (
    <div className="admin-panel">
      {!cmsReady && (
        <p className="admin-message admin-message--error">
          Upload bị tắt cho đến khi CMS tables được tạo. Xem bảng chẩn đoán phía trên.
        </p>
      )}
      <div className="admin-toolbar">
        <select
          value={folder}
          onChange={(e) => setFolder(e.target.value)}
          className="admin-select"
          aria-label="Lọc thư mục"
        >
          {FOLDERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        <input
          type="search"
          placeholder="Tìm theo tên file..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="admin-input admin-input--inline"
        />
        <select
          value={uploadFolder}
          onChange={(e) => setUploadFolder(e.target.value)}
          className="admin-select"
          aria-label="Thư mục upload"
        >
          {FOLDERS.filter((f) => f.value).map((f) => (
            <option key={f.value} value={f.value}>
              Upload → {f.label}
            </option>
          ))}
        </select>
        <label className={`admin-btn admin-btn--primary admin-upload-btn${uploading || !cmsReady ? " admin-btn--disabled" : ""}`}>
          {uploading ? "Đang tải lên..." : "Tải ảnh lên"}
          <input
            type="file"
            accept={ALLOWED_IMAGE_EXTENSIONS.join(",")}
            hidden
            disabled={uploading || !cmsReady}
            onChange={handleUpload}
          />
        </label>
      </div>

      {message && (
        <p className={`admin-message admin-message--${message.type}`}>{message.text}</p>
      )}

      {loading ? (
        <p className="admin-loading">Đang tải thư viện ảnh...</p>
      ) : assets.length === 0 ? (
        <div className="admin-empty-state">
          <p>Chưa có ảnh trong thư mục này.</p>
          <p className="admin-empty-hint">
            Chọn thư mục và bấm &quot;Tải ảnh lên&quot; để thêm ảnh JPG, PNG hoặc WebP.
          </p>
        </div>
      ) : (
        <div className="admin-media-grid">
          {assets.map((asset) => (
            <div key={asset.id} className="admin-media-card">
              <div className="admin-media-preview">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={asset.url} alt={asset.altText ?? asset.filename} />
              </div>
              <div className="admin-media-meta">
                <p className="admin-media-filename" title={asset.filename}>
                  {asset.filename}
                </p>
                <p className="admin-media-folder">
                  {MEDIA_TO_STORAGE_FOLDER[asset.folder]}
                </p>
                <div className="admin-media-actions">
                  <button type="button" onClick={() => copyUrl(asset.url)}>
                    Copy URL
                  </button>
                  <button
                    type="button"
                    className="admin-btn--danger"
                    onClick={() => handleDelete(asset.id, asset.filename)}
                  >
                    Xóa
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
