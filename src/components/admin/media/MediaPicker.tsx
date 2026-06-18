"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MediaUsageType } from "@prisma/client";
import { ALLOWED_IMAGE_EXTENSIONS, inferImageMimeType } from "@/lib/imageValidation";
import type { StorageFolderKey } from "@/lib/storage/types";

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const WARN_FILE_SIZE = 500 * 1024;
const isDev = process.env.NODE_ENV === "development";

type RawMediaItem = Record<string, unknown>;

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

type FetchStep = {
  label: string;
  folder?: StorageFolderKey;
  usageType?: MediaUsageType;
};

type PickerBaseProps = {
  label?: string;
  folder?: StorageFolderKey;
  usageType?: MediaUsageType | "auto";
};

type SingleProps = PickerBaseProps & {
  multiple?: false;
  value?: string | null;
  onChange: (url: string) => void;
};

type MultiProps = PickerBaseProps & {
  multiple: true;
  selectedUrls?: string[];
  onAdd: (urls: string[]) => void;
};

type Props = SingleProps | MultiProps;

const FOLDER_LABELS: Record<StorageFolderKey, string> = {
  categories: "Danh mục",
  general: "Chung",
  products: "Sản phẩm",
  blog: "Blog",
  clients: "Khách hàng",
  branding: "Thương hiệu",
  "case-studies": "Dự án",
};

function pickString(raw: RawMediaItem, keys: string[]): string | null {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

/** Normalize API payloads: array | { assets } | { items } | { data } */
function normalizeMediaResponse(data: unknown): RawMediaItem[] {
  if (Array.isArray(data)) return data as RawMediaItem[];
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    for (const key of ["assets", "items", "data"]) {
      const nested = obj[key];
      if (Array.isArray(nested)) return nested as RawMediaItem[];
    }
  }
  return [];
}

function getAssetSelectableUrl(raw: RawMediaItem): string | null {
  return pickString(raw, ["url", "imageUrl", "secureUrl", "secure_url", "image_url"]);
}

function getAssetThumbnailUrl(raw: RawMediaItem, selectUrl: string): string {
  return (
    pickString(raw, ["thumbnailUrl", "thumbnail_url", "thumbUrl"]) ?? selectUrl
  );
}

function normalizeAsset(raw: RawMediaItem, index: number): AssetRow | null {
  const url = getAssetSelectableUrl(raw);
  if (!url) return null;

  return {
    id: String(raw.id ?? raw.publicId ?? `${url}-${index}`),
    url,
    thumbnailUrl: getAssetThumbnailUrl(raw, url),
    filename: pickString(raw, ["filename", "originalName", "name"]) ?? "image",
    altText: pickString(raw, ["altText", "alt"]),
    title: pickString(raw, ["title"]),
    sizeBytes: Number(raw.sizeBytes ?? raw.bytes ?? 0) || 0,
    folder: String(raw.folder ?? ""),
  };
}

function normalizeAssetList(data: unknown): AssetRow[] {
  return normalizeMediaResponse(data)
    .map((raw, index) => normalizeAsset(raw, index))
    .filter((asset): asset is AssetRow => asset !== null);
}

function extractUploadUrl(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  return getAssetSelectableUrl(data as RawMediaItem);
}

function uploadUsageTypeForFolder(
  folder: StorageFolderKey,
  explicit?: MediaUsageType | "auto"
): MediaUsageType {
  if (explicit && explicit !== "auto") return explicit;
  if (folder === "products") return "PRODUCT";
  if (folder === "blog") return "BLOG";
  return "GENERAL";
}

function getLoadFallbackSteps(
  folder: StorageFolderKey,
  usageType: MediaUsageType | "auto"
): FetchStep[] {
  if (folder === "categories" && usageType === "auto") {
    return [
      { label: "categories", folder: "categories" },
      { label: "general", folder: "general" },
      { label: "products", folder: "products" },
      { label: "all", folder: undefined },
    ];
  }

  if (folder === "products" && usageType === "auto") {
    return [
      { label: "products", folder: "products", usageType: "PRODUCT" },
      { label: "products-no-usage", folder: "products" },
      { label: "general", folder: "general" },
      { label: "all", folder: undefined },
    ];
  }

  if (folder === "blog" && usageType === "auto") {
    return [
      { label: "blog", folder: "blog", usageType: "BLOG" },
      { label: "blog-no-usage", folder: "blog" },
      { label: "general", folder: "general" },
      { label: "all", folder: undefined },
    ];
  }

  const explicitUsage = usageType !== "auto" ? usageType : undefined;
  const steps: FetchStep[] = [{ label: folder, folder, usageType: explicitUsage }];
  if (explicitUsage) steps.push({ label: `${folder}-no-usage`, folder });
  if (folder !== "general") steps.push({ label: "general", folder: "general" });
  steps.push({ label: "all", folder: undefined });
  return steps;
}

function buildMediaApiUrl(step: FetchStep, search?: string): string {
  const params = new URLSearchParams();
  if (step.folder) params.set("folder", step.folder);
  if (step.usageType) params.set("usageType", step.usageType);
  if (search?.trim()) params.set("search", search.trim());
  const qs = params.toString();
  return qs ? `/api/media?${qs}` : "/api/media";
}

async function fetchMediaFromUrl(apiUrl: string): Promise<AssetRow[]> {
  const res = await fetch(apiUrl);
  if (!res.ok) {
    throw new Error(`Media API ${res.status} (${apiUrl})`);
  }
  const data: unknown = await res.json();
  const assets = normalizeAssetList(data);
  if (isDev) {
    console.log("[MediaPicker] fetched", apiUrl, assets.length);
  }
  return assets;
}

async function fetchMediaStep(
  step: FetchStep,
  search?: string
): Promise<{ url: string; assets: AssetRow[] }> {
  const url = buildMediaApiUrl(step, search);
  const assets = await fetchMediaFromUrl(url);
  return { url, assets };
}

async function loadMediaWithFallback(
  folder: StorageFolderKey,
  usageType: MediaUsageType | "auto",
  search?: string
): Promise<{ assets: AssetRow[]; stepLabel: string }> {
  const steps = getLoadFallbackSteps(folder, usageType);

  for (const step of steps) {
    const url = buildMediaApiUrl(step, search);
    const assets = await fetchMediaFromUrl(url);
    if (assets.length > 0) {
      if (isDev) {
        console.log("[MediaPicker] using fallback step:", step.label);
      }
      return { assets, stepLabel: step.label };
    }
  }

  return { assets: [], stepLabel: "none" };
}

function fallbackHint(stepLabel: string, pickerFolder: StorageFolderKey): string | null {
  if (stepLabel === "none" || stepLabel === pickerFolder) return null;
  if (stepLabel === "all") {
    return "Đang hiển thị ảnh từ toàn bộ thư viện Media.";
  }
  const folderKey = stepLabel.replace("-no-usage", "") as StorageFolderKey;
  const name = FOLDER_LABELS[folderKey] ?? stepLabel;
  return `Đang hiển thị ảnh từ thư mục ${name} (fallback).`;
}

export default function MediaPicker(props: Props) {
  const { label = "Ảnh", folder = "products", usageType = "auto" } = props;
  const multiple = props.multiple === true;

  const [open, setOpen] = useState(false);
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fallbackStep, setFallbackStep] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [uploadWarning, setUploadWarning] = useState<string | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);

  const singleValue = !multiple ? (props as SingleProps).value : undefined;
  const resolvedUploadUsage = uploadUsageTypeForFolder(folder, usageType);

  const loadAssets = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    setFallbackStep(null);
    try {
      const { assets: list, stepLabel } = await loadMediaWithFallback(
        folder,
        usageType,
        search
      );
      setAssets(list);
      setFallbackStep(stepLabel !== "none" && stepLabel !== folder ? stepLabel : null);
    } catch (err) {
      if (isDev) {
        console.error("[MediaPicker] load failed:", err);
      }
      setLoadError("Không tải được thư viện Media");
      setAssets([]);
    } finally {
      setLoading(false);
    }
  }, [folder, usageType, search]);

  const loadAllLibrary = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    setFallbackStep("all");
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      const apiUrl = params.toString() ? `/api/media?${params.toString()}` : "/api/media";
      const list = await fetchMediaFromUrl(apiUrl);
      setAssets(list);
    } catch (err) {
      if (isDev) {
        console.error("[MediaPicker] load all failed:", err);
      }
      setLoadError("Không tải được thư viện Media");
      setAssets([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    if (open) void loadAssets();
  }, [open, loadAssets]);

  function handleOpen() {
    if (multiple) {
      const sel = (props as MultiProps).selectedUrls ?? [];
      setChecked(new Set(sel));
    }
    setOpen(true);
  }

  function handleSingleSelect(asset: AssetRow) {
    const selectedUrl = asset.url;
    if (!selectedUrl) return;

    if (isDev) {
      console.log("[MediaPicker] selected", selectedUrl);
    }

    (props as SingleProps).onChange(selectedUrl);
    setOpen(false);
  }

  async function uploadNewImage(file: File) {
    const mimeType = inferImageMimeType(file.name, file.type);
    if (!mimeType) {
      setUploadWarning("Định dạng không hỗ trợ. Chỉ hỗ trợ JPG, PNG, WebP.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setUploadWarning("Dung lượng tối đa 2MB/ảnh.");
      return;
    }
    setUploadWarning(
      file.size > WARN_FILE_SIZE
        ? "Ảnh lớn hơn 500KB. Khuyến nghị 200–300KB."
        : null
    );

    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("folder", folder);
    fd.append("usageType", resolvedUploadUsage);
    try {
      const res = await fetch("/api/media", { method: "POST", body: fd });
      const data: unknown = await res.json();
      const uploadedUrl = extractUploadUrl(data);

      if (res.ok && uploadedUrl) {
        if (!multiple) {
          if (isDev) {
            console.log("[MediaPicker] selected", uploadedUrl);
          }
          (props as SingleProps).onChange(uploadedUrl);
          setOpen(false);
        } else {
          (props as MultiProps).onAdd([uploadedUrl]);
          await loadAssets();
        }
      } else {
        const message =
          data && typeof data === "object" && "message" in data
            ? String((data as { message?: string }).message)
            : "Upload thất bại";
        setUploadWarning(message);
      }
    } catch {
      setUploadWarning("Lỗi kết nối");
    }
    setUploading(false);
  }

  function toggleChecked(url: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  }

  function confirmMulti() {
    (props as MultiProps).onAdd(Array.from(checked));
    setOpen(false);
  }

  const fallbackMessage = fallbackStep ? fallbackHint(fallbackStep, folder) : null;

  return (
    <>
      {!multiple ? (
        <div className="admin-media-picker">
          {singleValue ? (
            <div className="admin-media-picker-preview">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={singleValue} alt={label} className="admin-media-picker-thumb" />
              <div className="admin-media-picker-actions">
                <button
                  type="button"
                  className="admin-btn admin-btn--secondary admin-btn--xs"
                  onClick={handleOpen}
                >
                  Chọn từ thư viện Media
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn--secondary admin-btn--xs"
                  onClick={() => (props as SingleProps).onChange("")}
                >
                  Xóa ảnh
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="admin-btn admin-btn--secondary"
              onClick={handleOpen}
            >
              Chọn từ thư viện Media
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          className="admin-btn admin-btn--secondary admin-btn--xs"
          onClick={handleOpen}
        >
          Chọn từ thư viện Media
        </button>
      )}

      {open && (
        <div className="admin-modal-overlay" onClick={() => setOpen(false)}>
          <div className="admin-modal admin-modal--wide" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3 className="admin-subtitle" style={{ margin: 0 }}>
                Thư viện ảnh{" "}
                {multiple && (
                  <span className="admin-field-hint">({checked.size} đã chọn)</span>
                )}
              </h3>
              <div style={{ display: "flex", gap: 8 }}>
                {multiple && (
                  <button
                    type="button"
                    className="admin-btn admin-btn--primary admin-btn--xs"
                    onClick={confirmMulti}
                    disabled={checked.size === 0}
                  >
                    Thêm {checked.size} ảnh
                  </button>
                )}
                <button
                  type="button"
                  className="admin-btn admin-btn--secondary admin-btn--xs"
                  onClick={() => setOpen(false)}
                >
                  ✕ Đóng
                </button>
              </div>
            </div>

            <div className="admin-catalog-filters" style={{ marginBottom: 12 }}>
              <input
                className="admin-input"
                placeholder="Tìm ảnh…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button
                type="button"
                className="admin-btn admin-btn--secondary admin-btn--xs"
                onClick={() => void loadAllLibrary()}
              >
                Hiển thị toàn bộ thư viện
              </button>
              <label className={`admin-btn admin-btn--secondary ${uploading ? "admin-btn--disabled" : ""}`}>
                {uploading ? "Đang tải…" : "Tải ảnh mới"}
                <input
                  ref={fileRef}
                  type="file"
                  accept={ALLOWED_IMAGE_EXTENSIONS.join(",")}
                  hidden
                  disabled={uploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void uploadNewImage(f);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>

            {uploadWarning && (
              <p style={{ color: "#d97706", fontSize: 12, marginBottom: 8 }}>{uploadWarning}</p>
            )}

            {loading ? (
              <p className="admin-field-hint">Đang tải…</p>
            ) : loadError ? (
              <div className="admin-media-picker-error">
                <p className="admin-error">{loadError}</p>
                <button
                  type="button"
                  className="admin-btn admin-btn--secondary admin-btn--xs"
                  onClick={() => void loadAssets()}
                >
                  Thử lại
                </button>
              </div>
            ) : assets.length === 0 ? (
              <p className="admin-field-hint">
                Chưa có ảnh trong thư viện. Hãy tải ảnh mới hoặc kiểm tra /admin/media.
              </p>
            ) : (
              <>
                {fallbackMessage && (
                  <p className="admin-field-hint" style={{ marginBottom: 8 }}>
                    {fallbackMessage}
                  </p>
                )}
                <div className="admin-media-grid admin-media-grid--picker">
                  {assets.map((asset) => {
                    const isSelected = multiple
                      ? checked.has(asset.url)
                      : singleValue === asset.url;
                    const displayUrl = asset.thumbnailUrl ?? asset.url;

                    return (
                      <button
                        key={asset.id}
                        type="button"
                        className={`admin-media-card admin-media-card--selectable ${isSelected ? "is-selected" : ""}`}
                        style={{ textAlign: "left", width: "100%", padding: 0 }}
                        onClick={() =>
                          multiple ? toggleChecked(asset.url) : handleSingleSelect(asset)
                        }
                      >
                        {multiple && (
                          <div style={{ position: "absolute", top: 4, right: 4, zIndex: 1 }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              readOnly
                              tabIndex={-1}
                              style={{ width: 16, height: 16, pointerEvents: "none" }}
                            />
                          </div>
                        )}
                        <div className="admin-media-preview" style={{ position: "relative" }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={displayUrl}
                            alt={asset.altText ?? asset.filename}
                            loading="lazy"
                          />
                        </div>
                        <p className="admin-media-filename" title={asset.filename}>
                          {asset.title?.trim() || asset.filename}
                        </p>
                        <p className="admin-field-hint">
                          {asset.sizeBytes > 0
                            ? `${(asset.sizeBytes / 1024).toFixed(0)}KB`
                            : "—"}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {multiple && checked.size > 0 && (
              <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button
                  type="button"
                  className="admin-btn admin-btn--secondary admin-btn--xs"
                  onClick={() => setChecked(new Set())}
                >
                  Bỏ chọn tất cả
                </button>
                <button type="button" className="admin-btn admin-btn--primary" onClick={confirmMulti}>
                  Thêm {checked.size} ảnh vào gallery
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
