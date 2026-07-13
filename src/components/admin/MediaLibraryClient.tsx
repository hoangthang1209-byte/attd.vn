"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MediaOrientation, MediaVisibility } from "@prisma/client";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import {
  ALLOWED_IMAGE_EXTENSIONS,
  inferImageMimeType,
} from "@/lib/imageValidation";
import { MEDIA_TO_STORAGE_FOLDER } from "@/lib/storage/types";
import { resolveLegacyFolderFromLibraryCode } from "@/features/media/media-classification";
import { CardGridLoading, InlineLoading } from "@/components/ui/loading/ContextLoading";
import type { MediaMasterDataRecord } from "@/features/media/media-master-data.types";
import type { MediaAssetWithClassification } from "@/features/media/services/media.service";

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const WARN_FILE_SIZE = 500 * 1024;
const MAX_BATCH = 50;
const BULK_MAX = 100;

const VISIBILITY_OPTIONS: { value: MediaVisibility | ""; label: string }[] = [
  { value: "", label: "Tất cả mức hiển thị" },
  { value: "PUBLIC", label: "Công khai" },
  { value: "INTERNAL", label: "Nội bộ" },
  { value: "PRIVATE", label: "Riêng tư" },
];

const ORIENTATION_OPTIONS: { value: MediaOrientation | ""; label: string }[] = [
  { value: "", label: "Tất cả hướng" },
  { value: "LANDSCAPE", label: "Ngang" },
  { value: "PORTRAIT", label: "Dọc" },
  { value: "SQUARE", label: "Vuông" },
  { value: "UNKNOWN", label: "Chưa xác định" },
];

type UploadFile = {
  file: File;
  id: string;
  status: "pending" | "uploading" | "done" | "error" | "warn";
  warning?: string;
  error?: string;
  result?: MediaAssetWithClassification;
};

type EditingAsset = {
  id: string;
  libraryId: string;
  roleId: string;
  visibility: MediaVisibility;
  altText: string;
  title: string;
  caption: string;
  description: string;
  tags: string;
  keywords: string;
  contentLanguage: string;
};

type ClassificationOption = MediaMasterDataRecord;

function mergeOptions(
  active: ClassificationOption[],
  current?: { id: string; code: string; name: string; isActive: boolean } | null,
): ClassificationOption[] {
  if (!current) return active;
  if (active.some((item) => item.id === current.id)) return active;
  return [
    {
      id: current.id,
      code: current.code,
      name: `${current.name}${current.isActive ? "" : " (đã vô hiệu)"}`,
      description: null,
      sortOrder: 0,
      isActive: current.isActive,
      isSystem: false,
      createdAt: "",
      updatedAt: "",
    },
    ...active,
  ];
}

export default function MediaLibraryClient({ cmsReady = true }: { cmsReady?: boolean }) {
  const toast = useAdminToast();
  const [assets, setAssets] = useState<MediaAssetWithClassification[]>([]);
  const [libraries, setLibraries] = useState<ClassificationOption[]>([]);
  const [roles, setRoles] = useState<ClassificationOption[]>([]);
  const [libraryId, setLibraryId] = useState("");
  const [roleId, setRoleId] = useState("");
  const [visibility, setVisibility] = useState<MediaVisibility | "">("");
  const [orientation, setOrientation] = useState<MediaOrientation | "">("");
  const [hasAltText, setHasAltText] = useState<"" | "true" | "false">("");
  const [search, setSearch] = useState("");
  const [uploadLibraryId, setUploadLibraryId] = useState("");
  const [uploadRoleId, setUploadRoleId] = useState("");
  const [uploadVisibility, setUploadVisibility] = useState<MediaVisibility>("PUBLIC");
  const [uploadTags, setUploadTags] = useState("");
  const [uploadKeywords, setUploadKeywords] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploadQueue, setUploadQueue] = useState<UploadFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditingAsset | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editLibraryOptions, setEditLibraryOptions] = useState<ClassificationOption[]>([]);
  const [editRoleOptions, setEditRoleOptions] = useState<ClassificationOption[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkLibraryId, setBulkLibraryId] = useState("");
  const [bulkRoleId, setBulkRoleId] = useState("");
  const [bulkVisibility, setBulkVisibility] = useState<MediaVisibility>("PUBLIC");
  const [bulkTags, setBulkTags] = useState("");
  const [bulkKeywords, setBulkKeywords] = useState("");
  const [bulkUpdateLibrary, setBulkUpdateLibrary] = useState(false);
  const [bulkUpdateRole, setBulkUpdateRole] = useState(false);
  const [bulkUpdateVisibility, setBulkUpdateVisibility] = useState(false);
  const [bulkUpdateTags, setBulkUpdateTags] = useState(false);
  const [bulkUpdateKeywords, setBulkUpdateKeywords] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const loadTaxonomy = useCallback(async () => {
    try {
      const [libRes, roleRes] = await Promise.all([
        fetch("/api/content/media-libraries?activeOnly=1"),
        fetch("/api/content/media-roles?activeOnly=1"),
      ]);
      const libData = (await libRes.json()) as { libraries?: ClassificationOption[] };
      const roleData = (await roleRes.json()) as { roles?: ClassificationOption[] };
      const nextLibraries = libData.libraries ?? [];
      const nextRoles = roleData.roles ?? [];
      setLibraries(nextLibraries);
      setRoles(nextRoles);
      setUploadLibraryId((prev) => prev || nextLibraries.find((l) => l.code === "PRODUCT")?.id || nextLibraries[0]?.id || "");
      setUploadRoleId((prev) => prev || nextRoles.find((r) => r.code === "GENERAL")?.id || nextRoles[0]?.id || "");
    } catch {
      /* ignore taxonomy load errors */
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (libraryId) params.set("libraryId", libraryId);
      if (roleId) params.set("roleId", roleId);
      if (visibility) params.set("visibility", visibility);
      if (orientation) params.set("orientation", orientation);
      if (hasAltText) params.set("hasAltText", hasAltText);
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`/api/media?${params.toString()}`);
      const data = (await res.json()) as MediaAssetWithClassification[] | { message?: string };
      setAssets(Array.isArray(data) ? data : []);
    } catch {
      setAssets([]);
    }
    setLoading(false);
  }, [libraryId, roleId, visibility, orientation, hasAltText, search]);

  useEffect(() => {
    void loadTaxonomy();
  }, [loadTaxonomy]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setSelectedIds((prev) => {
      const visible = new Set(assets.map((asset) => asset.id));
      const next = new Set([...prev].filter((id) => visible.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [assets]);

  function validateFile(file: File): { ok: boolean; error?: string; warning?: string } {
    const mimeType = inferImageMimeType(file.name, file.type);
    if (!mimeType) return { ok: false, error: "Định dạng không hỗ trợ. Chỉ hỗ trợ JPG, PNG, WebP." };
    if (file.size > MAX_FILE_SIZE) {
      return { ok: false, error: `Dung lượng tối đa 2MB/ảnh (${(file.size / 1024 / 1024).toFixed(1)}MB).` };
    }
    if (file.size > WARN_FILE_SIZE) {
      return {
        ok: true,
        warning: `Ảnh này lớn hơn 500KB (${(file.size / 1024).toFixed(0)}KB). Khuyến nghị 200–300KB để website tải nhanh.`,
      };
    }
    return { ok: true };
  }

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
      setUploadQueue((q) => q.map((u) => (u.id === item.id ? { ...u, status: "uploading" } : u)));
      const fd = new FormData();
      fd.append("file", item.file);
      const uploadLibrary = libraries.find((l) => l.id === uploadLibraryId);
      const storageFolder = uploadLibrary
        ? MEDIA_TO_STORAGE_FOLDER[resolveLegacyFolderFromLibraryCode(uploadLibrary.code)]
        : "products";
      fd.append("folder", storageFolder);
      if (uploadLibraryId) fd.append("libraryId", uploadLibraryId);
      if (uploadRoleId) fd.append("roleId", uploadRoleId);
      fd.append("visibility", uploadVisibility);
      if (uploadTags.trim()) fd.append("tags", uploadTags);
      if (uploadKeywords.trim()) fd.append("keywords", uploadKeywords);
      try {
        const res = await fetch("/api/media", { method: "POST", body: fd });
        const data = (await res.json()) as { message?: string; warning?: string } & MediaAssetWithClassification;
        if (!res.ok) {
          setUploadQueue((q) =>
            q.map((u) =>
              u.id === item.id ? { ...u, status: "error", error: data.message ?? "Upload thất bại" } : u,
            ),
          );
        } else {
          setUploadQueue((q) =>
            q.map((u) =>
              u.id === item.id
                ? { ...u, status: "done", result: data, warning: data.warning ?? u.warning }
                : u,
            ),
          );
        }
      } catch {
        setUploadQueue((q) =>
          q.map((u) => (u.id === item.id ? { ...u, status: "error", error: "Lỗi kết nối" } : u)),
        );
      }
    }
    await load();
  }

  function clearQueue() {
    setUploadQueue([]);
    if (fileRef.current) fileRef.current.value = "";
  }
  function removeFromQueue(id: string) {
    setUploadQueue((q) => q.filter((u) => u.id !== id));
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragging(true);
  }
  function onDragLeave() {
    setDragging(false);
  }
  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
    if (files.length) addFilesToQueue(files);
  }

  async function copyUrl(url: string, id: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      /* ignore */
    }
  }

  async function handleDelete(id: string, filename: string) {
    if (!confirm(`Xóa ảnh "${filename}"?`)) return;
    const res = await fetch(`/api/media/${id}`, { method: "DELETE" });
    if (res.ok) await load();
  }

  function openEdit(asset: MediaAssetWithClassification) {
    setEditError(null);
    setEditLibraryOptions(mergeOptions(libraries, asset.library));
    setEditRoleOptions(mergeOptions(roles, asset.role));
    setEditing({
      id: asset.id,
      libraryId: asset.libraryId ?? "",
      roleId: asset.roleId ?? "",
      visibility: asset.visibility,
      altText: asset.altText ?? "",
      title: asset.title ?? "",
      caption: asset.caption ?? "",
      description: asset.description ?? "",
      tags: (asset.tags ?? []).join(", "),
      keywords: (asset.keywords ?? []).join(", "),
      contentLanguage: asset.contentLanguage ?? "",
    });
  }

  async function saveEdit() {
    if (!editing || editSaving) return;
    setEditSaving(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/media/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          libraryId: editing.libraryId || undefined,
          roleId: editing.roleId || undefined,
          visibility: editing.visibility,
          altText: editing.altText,
          title: editing.title,
          caption: editing.caption,
          description: editing.description,
          tags: editing.tags.split(",").map((t) => t.trim()).filter(Boolean),
          keywords: editing.keywords.split(",").map((t) => t.trim()).filter(Boolean),
          contentLanguage: editing.contentLanguage || null,
        }),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) {
        setEditError(data.message ?? "Không thể cập nhật metadata ảnh");
        return;
      }
      setEditing(null);
      toast.success("Đã cập nhật metadata ảnh");
      await load();
    } catch {
      setEditError("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setEditSaving(false);
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllLoaded() {
    setSelectedIds(new Set(assets.map((asset) => asset.id)));
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  function openBulkEdit() {
    setBulkError(null);
    setBulkUpdateLibrary(false);
    setBulkUpdateRole(false);
    setBulkUpdateVisibility(false);
    setBulkUpdateTags(false);
    setBulkUpdateKeywords(false);
    setBulkLibraryId(libraries[0]?.id ?? "");
    setBulkRoleId(roles[0]?.id ?? "");
    setBulkVisibility("PUBLIC");
    setBulkTags("");
    setBulkKeywords("");
    setBulkOpen(true);
  }

  async function saveBulkEdit() {
    if (bulkSaving || selectedIds.size === 0) return;
    if (
      !bulkUpdateLibrary &&
      !bulkUpdateRole &&
      !bulkUpdateVisibility &&
      !bulkUpdateTags &&
      !bulkUpdateKeywords
    ) {
      setBulkError("Chọn ít nhất một trường để cập nhật");
      return;
    }

    const payload: Record<string, unknown> = { ids: [...selectedIds] };
    if (bulkUpdateLibrary) payload.libraryId = bulkLibraryId;
    if (bulkUpdateRole) payload.roleId = bulkRoleId;
    if (bulkUpdateVisibility) payload.visibility = bulkVisibility;
    if (bulkUpdateTags) {
      payload.tags = bulkTags.split(",").map((t) => t.trim()).filter(Boolean);
    }
    if (bulkUpdateKeywords) {
      payload.keywords = bulkKeywords.split(",").map((t) => t.trim()).filter(Boolean);
    }

    setBulkSaving(true);
    setBulkError(null);
    try {
      const res = await fetch("/api/media/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { message?: string; updatedCount?: number };
      if (!res.ok) {
        setBulkError(data.message ?? "Không thể cập nhật hàng loạt");
        return;
      }
      const count = data.updatedCount ?? selectedIds.size;
      setBulkOpen(false);
      clearSelection();
      toast.success(`Đã cập nhật ${count} ảnh`);
      await load();
    } catch {
      setBulkError("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setBulkSaving(false);
    }
  }

  const hasQueue = uploadQueue.length > 0;
  const pendingCount = uploadQueue.filter((u) => u.status === "pending" || u.status === "warn").length;
  const selectedCount = selectedIds.size;
  const allLoadedSelected = assets.length > 0 && assets.every((asset) => selectedIds.has(asset.id));

  return (
    <div className="admin-media-page">
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
            <span className="admin-field-hint">
              hoặc click để chọn ảnh (JPG, PNG, WebP · max 2MB · tối đa 50 ảnh)
            </span>
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
            <div className="admin-media-queue-header" style={{ flexWrap: "wrap" }}>
              <span className="admin-field-hint">
                {uploadQueue.length} ảnh đã chọn · {pendingCount} sẵn sàng upload
              </span>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <select
                  className="admin-input admin-input--sm"
                  value={uploadLibraryId}
                  onChange={(e) => setUploadLibraryId(e.target.value)}
                >
                  {libraries.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
                <select
                  className="admin-input admin-input--sm"
                  value={uploadRoleId}
                  onChange={(e) => setUploadRoleId(e.target.value)}
                >
                  {roles.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
                <select
                  className="admin-input admin-input--sm"
                  value={uploadVisibility}
                  onChange={(e) => setUploadVisibility(e.target.value as MediaVisibility)}
                >
                  {VISIBILITY_OPTIONS.filter((v) => v.value).map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
                <input
                  className="admin-input admin-input--sm"
                  placeholder="Tags"
                  value={uploadTags}
                  onChange={(e) => setUploadTags(e.target.value)}
                />
                <input
                  className="admin-input admin-input--sm"
                  placeholder="Từ khóa SEO"
                  value={uploadKeywords}
                  onChange={(e) => setUploadKeywords(e.target.value)}
                />
                <button
                  type="button"
                  className="admin-btn admin-btn--primary"
                  onClick={() => void uploadAll()}
                  disabled={!pendingCount || !cmsReady}
                >
                  Tải lên {pendingCount > 0 ? `(${pendingCount})` : ""}
                </button>
                <button type="button" className="admin-btn admin-btn--secondary" onClick={clearQueue}>
                  Xóa danh sách
                </button>
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
                    <button
                      type="button"
                      className="admin-btn admin-btn--secondary admin-btn--xs"
                      onClick={() => removeFromQueue(item.id)}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="admin-catalog-filters" style={{ flexWrap: "wrap" }}>
        <input
          className="admin-input"
          placeholder="Tìm tên ảnh, tiêu đề, alt…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void load();
          }}
        />
        <select className="admin-input" value={libraryId} onChange={(e) => setLibraryId(e.target.value)}>
          <option value="">Tất cả thư viện</option>
          {libraries.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <select className="admin-input" value={roleId} onChange={(e) => setRoleId(e.target.value)}>
          <option value="">Tất cả vai trò</option>
          {roles.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <select
          className="admin-input"
          value={visibility}
          onChange={(e) => setVisibility(e.target.value as MediaVisibility | "")}
        >
          {VISIBILITY_OPTIONS.map((item) => (
            <option key={item.value || "all"} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <select
          className="admin-input"
          value={orientation}
          onChange={(e) => setOrientation(e.target.value as MediaOrientation | "")}
        >
          {ORIENTATION_OPTIONS.map((item) => (
            <option key={item.value || "all"} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <select
          className="admin-input"
          value={hasAltText}
          onChange={(e) => setHasAltText(e.target.value as "" | "true" | "false")}
        >
          <option value="">Alt text: tất cả</option>
          <option value="true">Có alt text</option>
          <option value="false">Thiếu alt text</option>
        </select>
        <button type="button" className="admin-btn admin-btn--secondary" onClick={() => void load()}>
          Lọc
        </button>
        <span className="admin-field-hint">{assets.length} ảnh</span>
        {assets.length > 0 && (
          <>
            <button
              type="button"
              className="admin-btn admin-btn--secondary admin-btn--xs"
              onClick={() => (allLoadedSelected ? clearSelection() : selectAllLoaded())}
            >
              {allLoadedSelected ? "Bỏ chọn tất cả" : "Chọn tất cả"}
            </button>
            {selectedCount > 0 && (
              <>
                <span className="admin-field-hint">{selectedCount} đã chọn</span>
                <button
                  type="button"
                  className="admin-btn admin-btn--secondary admin-btn--xs"
                  onClick={clearSelection}
                >
                  Xóa chọn
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn--primary admin-btn--xs"
                  onClick={openBulkEdit}
                  disabled={selectedCount > BULK_MAX}
                >
                  Sửa hàng loạt
                </button>
              </>
            )}
          </>
        )}
      </div>

      {loading ? (
        <CardGridLoading title="Đang tải thư viện ảnh…" tone="admin" cards={8} />
      ) : assets.length === 0 ? (
        <div className="admin-empty-state">
          <p>Chưa có ảnh trong bộ lọc này.</p>
        </div>
      ) : (
        <div className="admin-media-grid">
          {assets.map((asset) => {
            const isSelected = selectedIds.has(asset.id);
            return (
              <div
                key={asset.id}
                className={`admin-media-card ${isSelected ? "is-selected" : ""}`}
                style={isSelected ? { outline: "2px solid #4f46e5", borderColor: "#4f46e5" } : undefined}
              >
                <label
                  className="admin-field-hint"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 8px 0",
                    margin: 0,
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(asset.id)}
                  />
                  Chọn
                </label>
                <div className="admin-media-preview">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={asset.thumbnailUrl ?? asset.url}
                    alt={asset.altText ?? asset.filename}
                    loading="lazy"
                  />
                </div>
                <div className="admin-media-meta">
                  <p className="admin-media-filename" title={asset.filename}>
                    {asset.filename}
                  </p>
                  <p className="admin-field-hint" style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {asset.library && (
                      <span className="admin-badge">{asset.library.name}</span>
                    )}
                    {asset.role && <span className="admin-badge">{asset.role.name}</span>}
                    <span className="admin-badge">{asset.orientation}</span>
                    {asset.visibility !== "PUBLIC" && (
                      <span className="admin-badge">{asset.visibility}</span>
                    )}
                  </p>
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
                      onClick={() => openEdit(asset)}
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
            );
          })}
        </div>
      )}

      {editing && (
        <div className="admin-modal-overlay" onClick={() => !editSaving && setEditing(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="admin-subtitle">Chỉnh sửa ảnh</h3>
            <p className="admin-field-hint">
              Thay đổi metadata không làm thay đổi URL hoặc file đã tải lên.
            </p>
            <div className="admin-field">
              <label className="admin-label">Thư viện</label>
              <select
                className="admin-input"
                value={editing.libraryId}
                onChange={(e) => setEditing({ ...editing, libraryId: e.target.value })}
                disabled={editSaving}
              >
                {editLibraryOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="admin-field">
              <label className="admin-label">Vai trò hiển thị</label>
              <select
                className="admin-input"
                value={editing.roleId}
                onChange={(e) => setEditing({ ...editing, roleId: e.target.value })}
                disabled={editSaving}
              >
                {editRoleOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="admin-field">
              <label className="admin-label">Mức độ hiển thị</label>
              <select
                className="admin-input"
                value={editing.visibility}
                onChange={(e) =>
                  setEditing({ ...editing, visibility: e.target.value as MediaVisibility })
                }
                disabled={editSaving}
              >
                {VISIBILITY_OPTIONS.filter((v) => v.value).map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="admin-field">
              <label className="admin-label">Alt text</label>
              <input
                className="admin-input"
                value={editing.altText}
                onChange={(e) => setEditing({ ...editing, altText: e.target.value })}
                disabled={editSaving}
              />
            </div>
            <div className="admin-field">
              <label className="admin-label">Tiêu đề ảnh</label>
              <input
                className="admin-input"
                value={editing.title}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                disabled={editSaving}
              />
            </div>
            <div className="admin-field">
              <label className="admin-label">Chú thích</label>
              <input
                className="admin-input"
                value={editing.caption}
                onChange={(e) => setEditing({ ...editing, caption: e.target.value })}
                disabled={editSaving}
              />
            </div>
            <div className="admin-field">
              <label className="admin-label">Mô tả</label>
              <textarea
                className="admin-input"
                rows={3}
                value={editing.description}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                disabled={editSaving}
              />
            </div>
            <div className="admin-field">
              <label className="admin-label">Tags</label>
              <input
                className="admin-input"
                value={editing.tags}
                onChange={(e) => setEditing({ ...editing, tags: e.target.value })}
                disabled={editSaving}
              />
            </div>
            <div className="admin-field">
              <label className="admin-label">Từ khóa SEO</label>
              <input
                className="admin-input"
                value={editing.keywords}
                onChange={(e) => setEditing({ ...editing, keywords: e.target.value })}
                disabled={editSaving}
              />
            </div>
            <div className="admin-field">
              <label className="admin-label">Ngôn ngữ nội dung</label>
              <input
                className="admin-input"
                value={editing.contentLanguage}
                onChange={(e) => setEditing({ ...editing, contentLanguage: e.target.value })}
                placeholder="vi"
                disabled={editSaving}
              />
            </div>
            {editError && (
              <p className="admin-field-hint" style={{ color: "#dc2626" }} role="alert">
                {editError}
              </p>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className="admin-btn admin-btn--primary"
                onClick={() => void saveEdit()}
                disabled={editSaving}
              >
                {editSaving ? "Đang lưu…" : "Lưu"}
              </button>
              <button
                type="button"
                className="admin-btn admin-btn--secondary"
                onClick={() => setEditing(null)}
                disabled={editSaving}
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {bulkOpen && (
        <div className="admin-modal-overlay" onClick={() => !bulkSaving && setBulkOpen(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="admin-subtitle">Sửa metadata hàng loạt ({selectedCount} ảnh)</h3>
            <p className="admin-field-hint">
              Chỉ các trường được bật bên dưới mới được cập nhật. URL và file vật lý không thay đổi.
            </p>
            <div className="admin-field">
              <label className="admin-label" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  checked={bulkUpdateLibrary}
                  onChange={(e) => setBulkUpdateLibrary(e.target.checked)}
                  disabled={bulkSaving}
                />
                Cập nhật thư viện
              </label>
              {bulkUpdateLibrary && (
                <select
                  className="admin-input"
                  value={bulkLibraryId}
                  onChange={(e) => setBulkLibraryId(e.target.value)}
                  disabled={bulkSaving}
                >
                  {libraries.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="admin-field">
              <label className="admin-label" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  checked={bulkUpdateRole}
                  onChange={(e) => setBulkUpdateRole(e.target.checked)}
                  disabled={bulkSaving}
                />
                Cập nhật vai trò hiển thị
              </label>
              {bulkUpdateRole && (
                <select
                  className="admin-input"
                  value={bulkRoleId}
                  onChange={(e) => setBulkRoleId(e.target.value)}
                  disabled={bulkSaving}
                >
                  {roles.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="admin-field">
              <label className="admin-label" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  checked={bulkUpdateVisibility}
                  onChange={(e) => setBulkUpdateVisibility(e.target.checked)}
                  disabled={bulkSaving}
                />
                Cập nhật mức độ hiển thị
              </label>
              {bulkUpdateVisibility && (
                <select
                  className="admin-input"
                  value={bulkVisibility}
                  onChange={(e) => setBulkVisibility(e.target.value as MediaVisibility)}
                  disabled={bulkSaving}
                >
                  {VISIBILITY_OPTIONS.filter((v) => v.value).map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="admin-field">
              <label className="admin-label" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  checked={bulkUpdateTags}
                  onChange={(e) => setBulkUpdateTags(e.target.checked)}
                  disabled={bulkSaving}
                />
                Cập nhật tags
              </label>
              {bulkUpdateTags && (
                <input
                  className="admin-input"
                  value={bulkTags}
                  onChange={(e) => setBulkTags(e.target.value)}
                  disabled={bulkSaving}
                />
              )}
            </div>
            <div className="admin-field">
              <label className="admin-label" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  checked={bulkUpdateKeywords}
                  onChange={(e) => setBulkUpdateKeywords(e.target.checked)}
                  disabled={bulkSaving}
                />
                Cập nhật từ khóa SEO
              </label>
              {bulkUpdateKeywords && (
                <input
                  className="admin-input"
                  value={bulkKeywords}
                  onChange={(e) => setBulkKeywords(e.target.value)}
                  disabled={bulkSaving}
                />
              )}
            </div>
            {bulkError && (
              <p className="admin-field-hint" style={{ color: "#dc2626" }} role="alert">
                {bulkError}
              </p>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className="admin-btn admin-btn--primary"
                onClick={() => void saveBulkEdit()}
                disabled={bulkSaving}
              >
                {bulkSaving ? "Đang lưu…" : "Lưu"}
              </button>
              <button
                type="button"
                className="admin-btn admin-btn--secondary"
                onClick={() => setBulkOpen(false)}
                disabled={bulkSaving}
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
