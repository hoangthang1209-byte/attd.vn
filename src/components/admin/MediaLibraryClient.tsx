"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MediaAsset, MediaUsageType } from "@prisma/client";
import { MEDIA_TO_STORAGE_FOLDER } from "@/lib/storage/types";
import {
  ALLOWED_IMAGE_EXTENSIONS,
  inferImageMimeType,
} from "@/lib/imageValidation";
import { CardGridLoading, InlineLoading } from "@/components/ui/loading/ContextLoading";

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const WARN_FILE_SIZE = 500 * 1024;
const MAX_BATCH = 50;

const FOLDERS = [
  { value: "", label: "Tất cả" },
  { value: "products", label: "Sản phẩm" },
  { value: "blog", label: "Bài viết" },
  { value: "general", label: "Chung" },
  { value: "clients", label: "Khách hàng" },
  { value: "branding", label: "Thương hiệu" },
  { value: "categories", label: "Danh mục" },
  { value: "case-studies", label: "Dự án" },
];

const USAGE_TYPES: { value: string; label: string }[] = [
  { value: "", label: "Tất cả loại" },
  { value: "PRODUCT", label: "Sản phẩm" },
  { value: "BLOG", label: "Bài viết" },
  { value: "KNOWLEDGE_BASE", label: "Knowledge Base" },
  { value: "GENERAL", label: "Chung" },
];

type UploadFile = {
  file: File;
  id: string;
  status: "pending" | "uploading" | "done" | "error" | "warn";
  warning?: string;
  error?: string;
  result?: MediaAsset;
};

type EditingAsset = { id: string; altText: string; title: string; tags: string };

export default function MediaLibraryClient({ cmsReady = true }: { cmsReady?: boolean }) {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [folder, setFolder] = useState("");
  const [usageType, setUsageType] = useState("");
  const [search, setSearch] = useState("");
  const [uploadFolder, setUploadFolder] = useState("products");
  const [uploadUsageType, setUploadUsageType] = useState<MediaUsageType>("PRODUCT");
  const [loading, setLoading] = useState(true);
  const [uploadQueue, setUploadQueue] = useState<UploadFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditingAsset | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (folder) params.set("folder", folder);
      if (usageType) params.set("usageType", usageType);
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`/api/media?${params.toString()}`);
      const data = await res.json() as MediaAsset[] | { message?: string };
      setAssets(Array.isArray(data) ? data : []);
    } catch { setAssets([]); }
    setLoading(false);
  }, [folder, usageType, search]);

  useEffect(() => { void load(); }, [load]);

  // ─── Validation ──────────────────────────────────────────────────────────────

  function validateFile(file: File): { ok: boolean; error?: string; warning?: string } {
    const mimeType = inferImageMimeType(file.name, file.type);
    if (!mimeType) return { ok: false, error: `Định dạng không hỗ trợ. Chỉ hỗ trợ JPG, PNG, WebP.` };
    if (file.size > MAX_FILE_SIZE) return { ok: false, error: `Dung lượng tối đa 2MB/ảnh (${(file.size / 1024 / 1024).toFixed(1)}MB).` };
    if (file.size > WARN_FILE_SIZE) return { ok: true, warning: `Ảnh này lớn hơn 500KB (${(file.size / 1024).toFixed(0)}KB). Khuyến nghị 200–300KB để website tải nhanh.` };
    return { ok: true };
  }

  // ─── Queue management ────────────────────────────────────────────────────────

  function addFilesToQueue(files: File[]) {
    const limited = files.slice(0, MAX_BATCH);
    const entries: UploadFile[] = limited.map((file) => {
      const check = validateFile(file);
      return {
        file,
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        status: check.ok ? (check.warning ? "warn" : "pending") : "error",
        warning: check.warning,
        error: check.error,
      };
    });
    setUploadQueue((q) => [...q, ...entries]);
  }

  async function uploadAll() {
    const toUpload = uploadQueue.filter((u) => u.status === "pending" || u.status === "warn");
    if (!toUpload.length) return;

    for (const item of toUpload) {
      setUploadQueue((q) => q.map((u) => u.id === item.id ? { ...u, status: "uploading" } : u));
      const fd = new FormData();
      fd.append("file", item.file);
      fd.append("folder", uploadFolder);
      fd.append("usageType", uploadUsageType);
      try {
        const res = await fetch("/api/media", { method: "POST", body: fd });
        const data = await res.json() as { message?: string; warning?: string } & MediaAsset;
        if (!res.ok) {
          setUploadQueue((q) => q.map((u) => u.id === item.id ? { ...u, status: "error", error: data.message ?? "Upload thất bại" } : u));
        } else {
          setUploadQueue((q) => q.map((u) => u.id === item.id ? { ...u, status: "done", result: data, warning: data.warning ?? u.warning } : u));
        }
      } catch {
        setUploadQueue((q) => q.map((u) => u.id === item.id ? { ...u, status: "error", error: "Lỗi kết nối" } : u));
      }
    }
    await load();
  }

  function clearQueue() { setUploadQueue([]); if (fileRef.current) fileRef.current.value = ""; }
  function removeFromQueue(id: string) { setUploadQueue((q) => q.filter((u) => u.id !== id)); }

  // ─── Drag & drop ─────────────────────────────────────────────────────────────

  function onDragOver(e: React.DragEvent) { e.preventDefault(); setDragging(true); }
  function onDragLeave() { setDragging(false); }
  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
    if (files.length) addFilesToQueue(files);
  }

  // ─── Copy URL ────────────────────────────────────────────────────────────────

  async function copyUrl(url: string, id: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    } catch { /* ignore */ }
  }

  // ─── Delete ──────────────────────────────────────────────────────────────────

  async function handleDelete(id: string, filename: string) {
    if (!confirm(`Xóa ảnh "${filename}"?`)) return;
    const res = await fetch(`/api/media/${id}`, { method: "DELETE" });
    if (res.ok) await load();
  }

  // ─── Edit alt text ───────────────────────────────────────────────────────────

  async function saveEdit() {
    if (!editing) return;
    await fetch(`/api/media/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        altText: editing.altText,
        title: editing.title,
        tags: editing.tags.split(",").map((t) => t.trim()).filter(Boolean),
      }),
    });
    setEditing(null);
    await load();
  }

  const hasQueue = uploadQueue.length > 0;
  const pendingCount = uploadQueue.filter((u) => u.status === "pending" || u.status === "warn").length;

  return (
    <div className="admin-media-page">
      {/* Upload zone */}
      <div className="admin-catalog-fieldset">
        <h3 className="admin-subtitle">Tải ảnh lên</h3>

        <div
          ref={dropRef}
          className={`admin-media-dropzone ${dragging ? "is-dragging" : ""}`}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
        >
          <div className="admin-media-dropzone-inner">
            <span className="admin-media-dropzone-icon">🖼</span>
            <strong>Kéo thả ảnh vào đây</strong>
            <span className="admin-field-hint">hoặc click để chọn ảnh (JPG, PNG, WebP · max 2MB · tối đa 50 ảnh)</span>
            <span className="admin-field-hint">Khuyến nghị 200–300KB/ảnh để website tải nhanh</span>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept={ALLOWED_IMAGE_EXTENSIONS.join(",")}
            multiple
            hidden
            onChange={(e) => {
              if (e.target.files) addFilesToQueue(Array.from(e.target.files));
              e.target.value = "";
            }}
          />
        </div>

        {hasQueue && (
          <div className="admin-media-queue">
            <div className="admin-media-queue-header">
              <span className="admin-field-hint">{uploadQueue.length} ảnh đã chọn · {pendingCount} sẵn sàng upload</span>
              <div style={{ display: "flex", gap: 8 }}>
                <div className="admin-field" style={{ margin: 0 }}>
                  <select className="admin-input admin-input--sm" value={uploadFolder} onChange={(e) => setUploadFolder(e.target.value)}>
                    {FOLDERS.filter((f) => f.value).map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </div>
                <div className="admin-field" style={{ margin: 0 }}>
                  <select className="admin-input admin-input--sm" value={uploadUsageType} onChange={(e) => setUploadUsageType(e.target.value as MediaUsageType)}>
                    {USAGE_TYPES.filter((u) => u.value).map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
                  </select>
                </div>
                <button type="button" className="admin-btn admin-btn--primary" onClick={() => void uploadAll()} disabled={!pendingCount || !cmsReady}>
                  Tải lên {pendingCount > 0 ? `(${pendingCount})` : ""}
                </button>
                <button type="button" className="admin-btn admin-btn--secondary" onClick={clearQueue}>Xóa danh sách</button>
              </div>
            </div>
            <div className="admin-media-queue-list">
              {uploadQueue.map((item) => (
                <div key={item.id} className={`admin-media-queue-item status-${item.status}`}>
                  <span className="admin-media-queue-name">{item.file.name}</span>
                  <span className="admin-media-queue-size">({(item.file.size / 1024).toFixed(0)}KB)</span>
                  <span className="admin-media-queue-status">
                    {item.status === "uploading" && <InlineLoading title="Đang tải…" tone="admin" />}
                    {item.status === "done" && "✅ Xong"}
                    {item.status === "pending" && "⏸ Chờ"}
                    {item.status === "warn" && `⚠ ${item.warning}`}
                    {item.status === "error" && `❌ ${item.error}`}
                  </span>
                  {(item.status === "pending" || item.status === "warn" || item.status === "error") && (
                    <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" onClick={() => removeFromQueue(item.id)}>✕</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Library filters */}
      <div className="admin-catalog-filters">
        <input
          className="admin-input"
          placeholder="Tìm tên ảnh, tiêu đề…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") void load(); }}
        />
        <select className="admin-input" value={folder} onChange={(e) => setFolder(e.target.value)}>
          {FOLDERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
        <select className="admin-input" value={usageType} onChange={(e) => setUsageType(e.target.value)}>
          {USAGE_TYPES.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
        </select>
        <button type="button" className="admin-btn admin-btn--secondary" onClick={() => void load()}>Lọc</button>
        <span className="admin-field-hint">{assets.length} ảnh</span>
      </div>

      {/* Grid */}
      {loading ? (
        <CardGridLoading title="Đang tải thư viện ảnh…" tone="admin" cards={8} />
      ) : assets.length === 0 ? (
        <div className="admin-empty-state">
          <p>Chưa có ảnh trong thư mục này.</p>
          <p className="admin-field-hint">Kéo thả ảnh hoặc click vào vùng upload phía trên.</p>
        </div>
      ) : (
        <div className="admin-media-grid">
          {assets.map((asset) => (
            <div key={asset.id} className="admin-media-card">
              <div className="admin-media-preview">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={(asset as MediaAsset & { thumbnailUrl?: string | null }).thumbnailUrl ?? asset.url}
                  alt={(asset as MediaAsset & { altText?: string | null }).altText ?? asset.filename}
                  loading="lazy"
                />
              </div>
              <div className="admin-media-meta">
                <p className="admin-media-filename" title={asset.filename}>{asset.filename}</p>
                <p className="admin-field-hint">{MEDIA_TO_STORAGE_FOLDER[asset.folder]} · {(asset.sizeBytes / 1024).toFixed(0)}KB</p>
                {(asset as MediaAsset & { title?: string | null }).title && (
                  <p className="admin-field-hint" style={{ fontStyle: "italic" }}>
                    {(asset as MediaAsset & { title?: string | null }).title}
                  </p>
                )}
                <div className="admin-media-actions">
                  <button
                    type="button"
                    className="admin-btn admin-btn--secondary admin-btn--xs"
                    onClick={() => void copyUrl(asset.url, asset.id)}
                  >
                    {copied === asset.id ? "✓ Đã copy" : "Sao chép URL"}
                  </button>
                  <button
                    type="button"
                    className="admin-btn admin-btn--secondary admin-btn--xs"
                    onClick={() => setEditing({
                      id: asset.id,
                      altText: (asset as MediaAsset & { altText?: string | null }).altText ?? "",
                      title: (asset as MediaAsset & { title?: string | null }).title ?? "",
                      tags: ((asset as MediaAsset & { tags?: string[] }).tags ?? []).join(", "),
                    })}
                  >
                    Sửa
                  </button>
                  <button
                    type="button"
                    className="admin-btn admin-btn--secondary admin-btn--xs"
                    style={{ color: "#dc2626" }}
                    onClick={() => void handleDelete(asset.id, asset.filename)}
                  >
                    Xóa
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <div className="admin-modal-overlay" onClick={() => setEditing(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="admin-subtitle">Chỉnh sửa ảnh</h3>
            <div className="admin-field">
              <label className="admin-label">Alt text</label>
              <input className="admin-input" value={editing.altText} onChange={(e) => setEditing({ ...editing, altText: e.target.value })} />
            </div>
            <div className="admin-field">
              <label className="admin-label">Tiêu đề ảnh</label>
              <input className="admin-input" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
            </div>
            <div className="admin-field">
              <label className="admin-label">Tags (cách nhau bởi dấu phẩy)</label>
              <input className="admin-input" value={editing.tags} onChange={(e) => setEditing({ ...editing, tags: e.target.value })} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className="admin-btn admin-btn--primary" onClick={() => void saveEdit()}>Lưu</button>
              <button type="button" className="admin-btn admin-btn--secondary" onClick={() => setEditing(null)}>Hủy</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
