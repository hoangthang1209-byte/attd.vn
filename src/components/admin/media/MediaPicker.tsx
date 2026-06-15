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

// ─── Single-image picker ─────────────────────────────────────────────────────

type SingleProps = {
  multiple?: false;
  value?: string | null;
  onChange: (url: string) => void;
  label?: string;
  folder?: string;
};

// ─── Multi-image picker ───────────────────────────────────────────────────────

type MultiProps = {
  multiple: true;
  /** Currently selected URLs (shown as checked) */
  selectedUrls?: string[];
  onAdd: (urls: string[]) => void;
  label?: string;
  folder?: string;
};

type Props = SingleProps | MultiProps;

export default function MediaPicker(props: Props) {
  const { label = "Ảnh", folder = "products" } = props;
  const multiple = props.multiple === true;

  const [open, setOpen] = useState(false);
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [uploadWarning, setUploadWarning] = useState<string | null>(null);
  // multi mode: track checked set
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);

  // single mode values
  const singleValue = !multiple ? (props as SingleProps).value : undefined;

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

  function handleOpen() {
    if (multiple) {
      // pre-check already selected
      const sel = (props as MultiProps).selectedUrls ?? [];
      setChecked(new Set(sel));
    }
    setOpen(true);
  }

  async function uploadNewImage(file: File) {
    const mimeType = inferImageMimeType(file.name, file.type);
    if (!mimeType) { setUploadWarning("Định dạng không hỗ trợ. Chỉ hỗ trợ JPG, PNG, WebP."); return; }
    if (file.size > MAX_FILE_SIZE) { setUploadWarning("Dung lượng tối đa 2MB/ảnh."); return; }
    setUploadWarning(file.size > WARN_FILE_SIZE ? "Ảnh lớn hơn 500KB. Khuyến nghị 200–300KB." : null);

    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("folder", folder);
    fd.append("usageType", "PRODUCT");
    try {
      const res = await fetch("/api/media", { method: "POST", body: fd });
      const data = await res.json() as { url?: string; message?: string };
      if (res.ok && data.url) {
        if (!multiple) {
          (props as SingleProps).onChange(data.url);
          setOpen(false);
        } else {
          (props as MultiProps).onAdd([data.url]);
          void loadAssets();
        }
      } else {
        setUploadWarning(data.message ?? "Upload thất bại");
      }
    } catch { setUploadWarning("Lỗi kết nối"); }
    setUploading(false);
  }

  function handleSingleSelect(url: string) {
    (props as SingleProps).onChange(url);
    setOpen(false);
  }

  function toggleChecked(url: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url); else next.add(url);
      return next;
    });
  }

  function confirmMulti() {
    (props as MultiProps).onAdd(Array.from(checked));
    setOpen(false);
  }

  return (
    <>
      {/* Trigger */}
      {!multiple ? (
        <div className="admin-media-picker">
          {singleValue ? (
            <div className="admin-media-picker-preview">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={singleValue} alt={label} className="admin-media-picker-thumb" />
              <div className="admin-media-picker-actions">
                <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" onClick={handleOpen}>Đổi ảnh</button>
                <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" onClick={() => (props as SingleProps).onChange("")}>Xóa ảnh</button>
              </div>
            </div>
          ) : (
            <div className="admin-media-picker-empty" onClick={handleOpen}>
              <span>🖼</span><span>Chọn từ thư viện Media</span>
            </div>
          )}
        </div>
      ) : (
        <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" onClick={handleOpen}>
          🖼 Chọn từ thư viện Media
        </button>
      )}

      {/* Modal */}
      {open && (
        <div className="admin-modal-overlay" onClick={() => setOpen(false)}>
          <div className="admin-modal admin-modal--wide" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3 className="admin-subtitle" style={{ margin: 0 }}>
                Thư viện ảnh {multiple && <span className="admin-field-hint">({checked.size} đã chọn)</span>}
              </h3>
              <div style={{ display: "flex", gap: 8 }}>
                {multiple && (
                  <button type="button" className="admin-btn admin-btn--primary admin-btn--xs" onClick={confirmMulti} disabled={checked.size === 0}>
                    Thêm {checked.size} ảnh
                  </button>
                )}
                <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" onClick={() => setOpen(false)}>✕ Đóng</button>
              </div>
            </div>

            <div className="admin-catalog-filters" style={{ marginBottom: 12 }}>
              <input className="admin-input" placeholder="Tìm ảnh…" value={search} onChange={(e) => setSearch(e.target.value)} />
              <label className={`admin-btn admin-btn--secondary ${uploading ? "admin-btn--disabled" : ""}`}>
                {uploading ? "Đang tải…" : "Tải ảnh mới"}
                <input ref={fileRef} type="file" accept={ALLOWED_IMAGE_EXTENSIONS.join(",")} hidden disabled={uploading}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadNewImage(f); e.target.value = ""; }}
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
                {assets.map((asset) => {
                  const isSelected = multiple ? checked.has(asset.url) : singleValue === asset.url;
                  return (
                    <div
                      key={asset.id}
                      className={`admin-media-card admin-media-card--selectable ${isSelected ? "is-selected" : ""}`}
                      onClick={() => multiple ? toggleChecked(asset.url) : handleSingleSelect(asset.url)}
                    >
                      {multiple && (
                        <div style={{ position: "absolute", top: 4, right: 4, zIndex: 1 }}>
                          <input type="checkbox" checked={isSelected} readOnly style={{ width: 16, height: 16 }} />
                        </div>
                      )}
                      <div className="admin-media-preview" style={{ position: "relative" }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={asset.thumbnailUrl ?? asset.url} alt={asset.altText ?? asset.filename} loading="lazy" />
                      </div>
                      <p className="admin-media-filename" title={asset.filename}>{asset.filename}</p>
                      <p className="admin-field-hint">{(asset.sizeBytes / 1024).toFixed(0)}KB</p>
                    </div>
                  );
                })}
              </div>
            )}

            {multiple && checked.size > 0 && (
              <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" onClick={() => setChecked(new Set())}>Bỏ chọn tất cả</button>
                <button type="button" className="admin-btn admin-btn--primary" onClick={confirmMulti}>Thêm {checked.size} ảnh vào gallery</button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
