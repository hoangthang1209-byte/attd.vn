"use client";

import { useCallback, useRef, useState } from "react";
import type { MediaUsageType } from "@prisma/client";
import AdminUploadProgress, {
  type AdminUploadFileItem,
} from "@/components/admin/feedback/AdminUploadProgress";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";
import {
  buildMediaLibraryApiUrl,
  MEDIA_LIBRARY_PAGE_SIZE,
  MEDIA_PICKER_DEFAULT_LIBRARY_VIEW,
  parseMediaLibraryResponse,
  type MediaPickerLibraryView,
} from "@/components/admin/media/media-library-api";
import { CardGridLoading, ButtonLoading } from "@/components/ui/loading/ContextLoading";
import { useAdminToast } from "@/hooks/useAdminToast";
import { ALLOWED_IMAGE_EXTENSIONS, inferImageMimeType } from "@/lib/imageValidation";
import type { StorageFolderKey } from "@/lib/storage/types";
import { getPublicMediaUrl } from "@/features/media/get-public-media-url";

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
  return getPublicMediaUrl({
    url: pickString(raw, ["url"]),
    publicUrl: pickString(raw, ["publicUrl", "public_url"]),
    fileUrl: pickString(raw, ["fileUrl", "file_url"]),
    secureUrl: pickString(raw, ["secureUrl", "secure_url"]),
    imageUrl: pickString(raw, ["imageUrl", "image_url"]),
    thumbnailUrl: pickString(raw, ["thumbnailUrl", "thumbnail_url", "thumbUrl"]),
  });
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

async function fetchMediaLibraryPage(apiUrl: string): Promise<{
  assets: AssetRow[];
  nextCursor: string | null;
  hasMore: boolean;
  total: number | null;
}> {
  const res = await fetch(apiUrl);
  if (!res.ok) {
    throw new Error(`Media API ${res.status} (${apiUrl})`);
  }
  const data: unknown = await res.json();
  const page = parseMediaLibraryResponse(data);
  const assets = normalizeAssetList(page.items);
  if (isDev) {
    console.log("[MediaPicker] fetched", apiUrl, assets.length, {
      hasMore: page.hasMore,
      nextCursor: page.nextCursor,
    });
  }
  return {
    assets,
    nextCursor: page.nextCursor,
    hasMore: page.hasMore,
    total: page.total,
  };
}

async function loadMediaWithFallback(
  folder: StorageFolderKey,
  usageType: MediaUsageType | "auto",
  search?: string
): Promise<{ assets: AssetRow[]; stepLabel: string }> {
  const steps = getLoadFallbackSteps(folder, usageType);

  for (const step of steps) {
    const url = buildMediaLibraryApiUrl({
      folder: step.folder,
      usageType: step.usageType,
      search,
      paginated: true,
      limit: MEDIA_LIBRARY_PAGE_SIZE,
    });
    const { assets } = await fetchMediaLibraryPage(url);
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

type LibraryView = MediaPickerLibraryView;

export type { MediaPickerLibraryView };
export { MEDIA_PICKER_DEFAULT_LIBRARY_VIEW };

export default function MediaPicker(props: Props) {
  const { label = "Ảnh", folder = "products", usageType = "auto" } = props;
  const multiple = props.multiple === true;

  const [open, setOpen] = useState(false);
  const [libraryView, setLibraryView] = useState<LibraryView>(MEDIA_PICKER_DEFAULT_LIBRARY_VIEW);
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fallbackStep, setFallbackStep] = useState<string | null>(null);
  const [uploadQueue, setUploadQueue] = useState<AdminUploadFileItem[]>([]);
  const [lastUploadFile, setLastUploadFile] = useState<File | null>(null);
  const [search, setSearch] = useState("");
  const [uploadWarning, setUploadWarning] = useState<string | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);
  const toast = useAdminToast();
  const uploading = uploadQueue.some(
    (f) => f.state === "preparing" || f.state === "uploading" || f.state === "processing",
  );

  const singleValue = !multiple ? (props as SingleProps).value : undefined;
  const resolvedUploadUsage = uploadUsageTypeForFolder(folder, usageType);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshAssets = useCallback(
    async (view: LibraryView, query: string) => {
      setLoading(true);
      setLoadError(null);
      setNextCursor(null);
      setHasMore(false);
      setTotalCount(null);
      try {
        if (view === "all") {
          setFallbackStep("all");
          const apiUrl = buildMediaLibraryApiUrl({ search: query, paginated: true });
          const page = await fetchMediaLibraryPage(apiUrl);
          setAssets(page.assets);
          setNextCursor(page.nextCursor);
          setHasMore(page.hasMore);
          setTotalCount(page.total);
        } else {
          setFallbackStep(null);
          const apiUrl = buildMediaLibraryApiUrl({
            folder,
            usageType: usageType !== "auto" ? usageType : undefined,
            search: query,
            paginated: true,
          });
          try {
            const page = await fetchMediaLibraryPage(apiUrl);
            if (page.assets.length > 0) {
              setAssets(page.assets);
              setNextCursor(page.nextCursor);
              setHasMore(page.hasMore);
              setTotalCount(page.total);
              return;
            }
          } catch {
            // Fall through to legacy folder fallback below.
          }

          const { assets: list, stepLabel } = await loadMediaWithFallback(
            folder,
            usageType,
            query,
          );
          setAssets(list);
          setNextCursor(null);
          setHasMore(false);
          setTotalCount(list.length);
          setFallbackStep(stepLabel !== "none" && stepLabel !== folder ? stepLabel : null);
        }
      } catch (err) {
        if (isDev) {
          console.error("[MediaPicker] load failed:", err);
        }
        setLoadError("Không tải được thư viện Media");
        setAssets([]);
      } finally {
        setLoading(false);
      }
    },
    [folder, usageType],
  );

  const loadMoreAssets = useCallback(async () => {
    if (!hasMore || !nextCursor || loadingMore || loading) return;
    setLoadingMore(true);
    setLoadError(null);
    try {
      const apiUrl =
        libraryView === "all"
          ? buildMediaLibraryApiUrl({
              search,
              cursor: nextCursor,
              paginated: true,
            })
          : buildMediaLibraryApiUrl({
              folder,
              usageType: usageType !== "auto" ? usageType : undefined,
              search,
              cursor: nextCursor,
              paginated: true,
            });
      const page = await fetchMediaLibraryPage(apiUrl);
      setAssets((current) => {
        const seen = new Set(current.map((asset) => asset.id));
        const appended = page.assets.filter((asset) => !seen.has(asset.id));
        return [...current, ...appended];
      });
      setNextCursor(page.nextCursor);
      setHasMore(page.hasMore);
      if (page.total != null) setTotalCount(page.total);
    } catch (err) {
      if (isDev) {
        console.error("[MediaPicker] load more failed:", err);
      }
      setLoadError("Không tải thêm được ảnh từ thư viện Media");
    } finally {
      setLoadingMore(false);
    }
  }, [folder, hasMore, libraryView, loading, loadingMore, nextCursor, search, usageType]);

  function handleOpen() {
    if (multiple) {
      const sel = (props as MultiProps).selectedUrls ?? [];
      setChecked(new Set(sel));
    }
    setSearch("");
    setLibraryView(MEDIA_PICKER_DEFAULT_LIBRARY_VIEW);
    setNextCursor(null);
    setHasMore(false);
    setTotalCount(null);
    setOpen(true);
    void refreshAssets(MEDIA_PICKER_DEFAULT_LIBRARY_VIEW, "");
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    if (!open) return;
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      void refreshAssets(libraryView, value);
    }, 300);
  }

  function handleLibraryViewChange(view: LibraryView) {
    setLibraryView(view);
    if (!open) return;
    void refreshAssets(view, search);
  }

  function handleSingleSelect(asset: AssetRow) {
    const selectedUrl = getPublicMediaUrl(asset.url) ?? getPublicMediaUrl(asset);
    if (!selectedUrl) {
      toast.error("Ảnh này chưa có URL public hợp lệ. Vui lòng tải lại ảnh hoặc chọn ảnh khác.");
      return;
    }

    if (isDev) {
      console.log("[MediaPicker] selected", selectedUrl);
    }

    (props as SingleProps).onChange(selectedUrl);
    setOpen(false);
  }

  async function uploadNewImage(file: File) {
    if (uploading) return;

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

    const id = `${file.name}-${Date.now()}`;
    setLastUploadFile(file);
    setUploadQueue([
      { id, name: file.name, sizeBytes: file.size, state: "preparing", progress: null },
    ]);

    const fd = new FormData();
    fd.append("file", file);
    fd.append("folder", folder);
    fd.append("usageType", resolvedUploadUsage);

    setUploadQueue([
      { id, name: file.name, sizeBytes: file.size, state: "uploading", progress: null },
    ]);

    try {
      const res = await fetch("/api/media", { method: "POST", body: fd });
      const data: unknown = await res.json();
      const uploadedUrl = extractUploadUrl(data);

      if (res.ok && uploadedUrl) {
        setUploadQueue([
          { id, name: file.name, sizeBytes: file.size, state: "processing", progress: 90 },
        ]);

        if (!multiple) {
          (props as SingleProps).onChange(uploadedUrl);
          setOpen(false);
        } else {
          (props as MultiProps).onAdd([uploadedUrl]);
          await refreshAssets(libraryView, search);
        }

        setUploadQueue([
          { id, name: file.name, sizeBytes: file.size, state: "done", progress: 100 },
        ]);
        toast.success("Đã tải file lên.");
      } else {
        if (res.ok && !uploadedUrl) {
          toast.error("Ảnh này chưa có URL public hợp lệ. Vui lòng tải lại ảnh hoặc chọn ảnh khác.");
        }
        setUploadQueue([
          {
            id,
            name: file.name,
            sizeBytes: file.size,
            state: "error",
            errorMessage: "Không thể tải file. Vui lòng thử lại.",
          },
        ]);
        toast.error("Không thể tải file. Vui lòng thử lại.");
      }
    } catch {
      setUploadQueue([
        {
          id,
          name: file.name,
          sizeBytes: file.size,
          state: "error",
          errorMessage: "Không thể tải file. Vui lòng thử lại.",
        },
      ]);
      toast.error("Không thể tải file. Vui lòng thử lại.");
    }
  }

  function toggleChecked(url: string) {
    const canonical = getPublicMediaUrl(url);
    if (!canonical) return;
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(canonical)) next.delete(canonical);
      else next.add(canonical);
      return next;
    });
  }

  function confirmMulti() {
    const urls = Array.from(checked)
      .map((url) => getPublicMediaUrl(url))
      .filter((url): url is string => Boolean(url));
    if (!urls.length) return;
    (props as MultiProps).onAdd(urls);
    setOpen(false);
  }

  const fallbackMessage =
    libraryView === "folder" && fallbackStep ? fallbackHint(fallbackStep, folder) : null;

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
                onChange={(e) => handleSearchChange(e.target.value)}
              />
              <div className="admin-media-picker-filters" role="tablist" aria-label="Bộ lọc thư viện">
                <button
                  type="button"
                  role="tab"
                  aria-selected={libraryView === "all"}
                  className={`admin-btn admin-btn--xs ${libraryView === "all" ? "admin-btn--primary" : "admin-btn--secondary"}`}
                  onClick={() => handleLibraryViewChange("all")}
                >
                  Tất cả thư viện
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={libraryView === "folder"}
                  className={`admin-btn admin-btn--xs ${libraryView === "folder" ? "admin-btn--primary" : "admin-btn--secondary"}`}
                  onClick={() => handleLibraryViewChange("folder")}
                >
                  {FOLDER_LABELS[folder] ?? folder}
                </button>
              </div>
              <label className={`admin-btn admin-btn--secondary ${uploading ? "admin-btn--disabled" : ""}`}>
                {uploading ? <ButtonLoading title="Đang tải…" tone="admin" /> : "Tải ảnh mới"}
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

            <AdminUploadProgress
              files={uploadQueue}
              onRetry={
                lastUploadFile
                  ? () => {
                      void uploadNewImage(lastUploadFile);
                    }
                  : undefined
              }
            />

            {loading ? (
              <CardGridLoading title="Đang tải thư viện ảnh…" tone="admin" cards={8} />
            ) : loadError ? (
              <div className="admin-media-picker-error">
                <p className="admin-error">{loadError}</p>
                <button
                  type="button"
                  className="admin-btn admin-btn--secondary admin-btn--xs"
                  onClick={() => void refreshAssets(libraryView, search)}
                >
                  Thử lại
                </button>
              </div>
            ) : assets.length === 0 ? (
              <p className="admin-field-hint">
                {libraryView === "all"
                  ? "Chưa có ảnh trong thư viện. Hãy tải ảnh mới hoặc kiểm tra /admin/media."
                  : `Chưa có ảnh trong thư mục ${FOLDER_LABELS[folder] ?? folder}. Thử chọn Tất cả thư viện hoặc tải ảnh mới.`}
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
                {totalCount != null && (
                  <p className="admin-field-hint" style={{ marginTop: 8 }}>
                    Đang hiển thị {assets.length} / {totalCount} ảnh
                  </p>
                )}
                {hasMore && (
                  <div style={{ marginTop: 12, display: "flex", justifyContent: "center" }}>
                    <AdminLoadingButton
                      size="xs"
                      variant="secondary"
                      pending={loadingMore}
                      pendingLabel="Đang tải thêm…"
                      disabled={loadingMore}
                      onClick={() => void loadMoreAssets()}
                    >
                      Tải thêm
                    </AdminLoadingButton>
                  </div>
                )}
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
