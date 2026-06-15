"use client";

import { useEffect, useRef, useState } from "react";
import { ALLOWED_IMAGE_EXTENSIONS, inferImageMimeType } from "@/lib/imageValidation";

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const WARN_FILE_SIZE = 500 * 1024;

type AssetRow = {
  id: string;
  url: string;
  thumbnailUrl?: string | null;
  filename: string;
  altText?: string | null;
  title?: string | null;
  sizeBytes: number;
  folder: string;
};

type Props = {
  value?: string | null;
  onChange: (url: string) => void;
  label?: string;
  folder?: string;
  multiple?: false;
};

export default function MediaPicker({ value, onChange, label = "Ảnh đại diện", folder = "products" }: Props) {
  const [open, setOpen] = useState(false);
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [uploadWarning, setUploadWarning] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function loadAssets() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ folder, usageType: "PRODUCT" });
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`/api/media?${params.toString()}`);
      const data = await res.json() as AssetRow[];
      setAssets(Array.isArray(data) ? data : []);
    } catch { setAssets([]); }
    setLoading(false);
  }

  useEffect(() => {
    if (open) void loadAssets();
  }, [open, search]); // eslint-disable-line react-hooks/exhaustive-deps

  async function uploadNewImage(file: File) {
    const mimeType = inferImageMimeType(file.name, file.type);
    if (!mimeType) { setUploadWarning("Định dạng không hỗ trợ. Chỉ hỗ trợ JPG, PNG, WebP."); return; }
    if (file.size > MAX_FILE_SIZE) { setUploadWarning(`Dung lượng tối đa 2MB/ảnh.`); return; }
    if (file.size > WARN_FILE_SIZE) {
      setUploadWarning(`Ảnh lớn hơn 500KB. Khuyến nghị 200–300KB để website tải nhanh.`);
    } else {
      setUploadWarning(null);
    }

    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("folder", folder);
    fd.append("usageType", "PRODUCT");
    try {
      const res = await fetch("/api/media", { method: "POST", body: fd });
      const data = await res.json() as { url?: string; message?: string };
      if (res.ok && data.url) {
        onChange(data.url);
        setOpen(false);
        void loadAssets();
      } else {
        setUploadWarning(data.message ?? "Upload thất bại");
      }
    } catch { setUploadWarning("Lỗi kết nối"); }
    setUploading(false);
  }

  return (
    <div className="admin-media-picker">
      {/* Current image preview */}
      {value ? (
        <div className="admin-media-picker-preview">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt={label} className="admin-media-picker-thumb" />
          <div className="admin-media-picker-actions">
            <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" onClick={() => setOpen(true)}>Đổi ảnh</button>
            <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" onClick={() => onChange("")}>Xóa ảnh</button>
          </div>
        </div>
      ) : (
        <div className="admin-media-picker-empty" onClick={() => setOpen(true)}>
          <span>🖼</span>
          <span>Chọn ảnh</span>
        </div>
      )}

      {/* Picker modal */}
      {open && (
        <div className="admin-modal-overlay" onClick={() => setOpen(false)}>
          <div className="admin-modal admin-modal--wide" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3 className="admin-subtitle" style={{ margin: 0 }}>Thư viện ảnh</h3>
              <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" onClick={() => setOpen(false)}>✕ Đóng</button>
            </div>

            <div className="admin-catalog-filters" style={{ marginBottom: 12 }}>
              <input className="admin-input" placeholder="Tìm ảnh…" value={search} onChange={(e) => setSearch(e.target.value)} />
              <label className={`admin-btn admin-btn--secondary ${uploading ? "admin-btn--disabled" : ""}`}>
                {uploading ? "Đang tải…" : "Tải ảnh mới"}
                <input
                  ref={fileRef}
                  type="file"
                  accept={ALLOWED_IMAGE_EXTENSIONS.join(",")}
                  hidden
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadNewImage(file);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>

            {uploadWarning && <p style={{ color: "#d97706", fontSize: 12, marginBottom: 8 }}>{uploadWarning}</p>}

            {loading ? (
              <p className="admin-field-hint">Đang tải…</p>
            ) : assets.length === 0 ? (
              <p className="admin-field-hint">Chưa có ảnh. Tải ảnh mới để bắt đầu.</p>
            ) : (
              <div className="admin-media-grid admin-media-grid--picker">
                {assets.map((asset) => (
                  <div
                    key={asset.id}
                    className={`admin-media-card admin-media-card--selectable ${value === asset.url ? "is-selected" : ""}`}
                    onClick={() => { onChange(asset.url); setOpen(false); }}
                  >
                    <div className="admin-media-preview">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={asset.thumbnailUrl ?? asset.url} alt={asset.altText ?? asset.filename} loading="lazy" />
                    </div>
                    <p className="admin-media-filename" title={asset.filename}>{asset.filename}</p>
                    <p className="admin-field-hint">{(asset.sizeBytes / 1024).toFixed(0)}KB</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
