"use client";

import { useCallback, useEffect, useState } from "react";
import type { MediaAsset } from "@prisma/client";
import { AdminLoadingState } from "@/components/admin/AdminUi";
import { ButtonLoading } from "@/components/ui/loading/ContextLoading";
import type { StorageFolderKey } from "@/lib/storage/types";
import {
  ALLOWED_IMAGE_EXTENSIONS,
  inferImageMimeType,
} from "@/lib/imageValidation";

export type MediaPickerValue = {
  id: string;
  url: string;
  filename: string;
};

type MediaPickerProps = {
  value: MediaPickerValue | null;
  onChange: (value: MediaPickerValue | null) => void;
  folder: StorageFolderKey;
  label?: string;
  required?: boolean;
};

function toPickerValue(asset: MediaAsset): MediaPickerValue {
  return { id: asset.id, url: asset.url, filename: asset.filename };
}

export default function MediaPicker({
  value,
  onChange,
  folder,
  label = "Ảnh",
  required = false,
}: MediaPickerProps) {
  const [open, setOpen] = useState(false);
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [search, setSearch] = useState("");
  const [filterFolder, setFilterFolder] = useState(folder);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(
    null
  );

  useEffect(() => {
    if (open) {
      setFilterFolder(folder);
      setSearch("");
      setMessage(null);
    }
  }, [open, folder]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("folder", filterFolder);
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`/api/media?${params.toString()}`);
      const data = await res.json();
      setAssets(Array.isArray(data) ? data : []);
    } catch {
      setAssets([]);
      setMessage({ type: "error", text: "Không thể tải thư viện ảnh" });
    } finally {
      setLoading(false);
    }
  }, [filterFolder, search]);

  useEffect(() => {
    if (!open) return;
    void load();
  }, [open, load]);

  function handleSelect(asset: MediaAsset) {
    onChange(toPickerValue(asset));
    setOpen(false);
    setMessage(null);
  }

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
    formData.append("folder", folder);

    try {
      const res = await fetch("/api/media", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.message ?? "Upload thất bại" });
        return;
      }

      setMessage({ type: "success", text: "✓ Upload thành công" });
      const picked = { id: data.id, url: data.url, filename: data.filename };
      onChange(picked);
      setFilterFolder(folder);
      setSearch("");
      await load();
      setOpen(false);
    } catch {
      setMessage({ type: "error", text: "Không thể kết nối máy chủ" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  function handleClear() {
    onChange(null);
  }

  return (
    <div className="admin-form-group admin-media-picker-field">
      <label>{label}{required ? " *" : ""}</label>

      <div className="admin-media-picker-trigger">
        {value ? (
          <div className="admin-media-picker-preview">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value.url} alt={value.filename} />
            <div className="admin-media-picker-preview-meta">
              <span className="admin-media-picker-filename">{value.filename}</span>
              <div className="admin-media-picker-preview-actions">
                <button type="button" className="admin-btn admin-btn--sm" onClick={() => setOpen(true)}>
                  Đổi ảnh
                </button>
                <button type="button" className="admin-btn admin-btn--sm admin-btn--danger" onClick={handleClear}>
                  Xóa
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button type="button" className="admin-btn admin-btn--primary" onClick={() => setOpen(true)}>
            Chọn ảnh
          </button>
        )}
      </div>

      {open && (
        <div className="admin-media-picker-overlay" role="presentation" onClick={() => setOpen(false)}>
          <div
            className="admin-media-picker-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Chọn ảnh từ thư viện"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="admin-media-picker-modal-header">
              <h3 className="admin-subtitle">Thư viện ảnh</h3>
              <button type="button" className="admin-media-picker-close" onClick={() => setOpen(false)}>
                ✕
              </button>
            </div>

            <div className="admin-toolbar">
              <select
                value={filterFolder}
                onChange={(e) => setFilterFolder(e.target.value as StorageFolderKey)}
                className="admin-select"
              >
                <option value="clients">Clients</option>
                <option value="case-studies">Case studies</option>
                <option value="products">Products</option>
                <option value="categories">Categories</option>
                <option value="branding">Branding</option>
              </select>
              <input
                type="search"
                placeholder="Tìm theo tên file..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="admin-input admin-input--inline"
              />
              <label className={`admin-btn admin-btn--primary admin-upload-btn${uploading ? " admin-btn--disabled" : ""}`}>
                {uploading ? <ButtonLoading title="Đang tải lên..." tone="admin" /> : "Tải ảnh mới"}
                <input
                  type="file"
                  accept={ALLOWED_IMAGE_EXTENSIONS.join(",")}
                  hidden
                  disabled={uploading}
                  onChange={handleUpload}
                />
              </label>
            </div>

            {message && (
              <p className={`admin-message admin-message--${message.type}`}>{message.text}</p>
            )}

            {loading ? (
              <AdminLoadingState label="Đang tải thư viện ảnh…" rows={4} />
            ) : assets.length === 0 ? (
              <div className="admin-empty-state">
                <p>Chưa có ảnh trong thư mục này.</p>
                <p className="admin-empty-hint">Tải ảnh mới hoặc chọn thư mục khác.</p>
              </div>
            ) : (
              <div className="admin-media-picker-grid">
                {assets.map((asset) => {
                  const selected = value?.id === asset.id;
                  return (
                    <button
                      key={asset.id}
                      type="button"
                      className={`admin-media-picker-item${selected ? " admin-media-picker-item--selected" : ""}`}
                      onClick={() => handleSelect(asset)}
                    >
                      <div className="admin-media-preview">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={asset.url} alt={asset.filename} />
                      </div>
                      <span className="admin-media-filename">{asset.filename}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
