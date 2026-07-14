"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { MediaAsset, MediaBundleSlotType, MediaContentSuitability } from "@prisma/client";
import MediaSuggestionPanel, {
  type MediaAssetSuggestion,
} from "@/components/admin/media/MediaSuggestionPanel";
import { AdminLoadingState } from "@/components/admin/AdminUi";
import { mapBundleSlotToBlogPlacement } from "@/features/content/blog-bundle-slot-map";
import type { MediaBundleDetail } from "@/features/media/services/media-bundle.service";

export type { MediaAssetSuggestion };

export type ContentMediaPickerProps = {
  entityType: "BLOG_POST" | "LANDING_PAGE" | "SEO_DRAFT" | "CASE_STUDY" | "OTHER";
  entityId?: string;
  placement: string;
  multiple?: boolean;
  query?: string;
  bundleId?: string;
  allowedSuitabilities?: MediaContentSuitability[];
  selectedAssetIds?: string[];
  onSelect: (assets: MediaAssetSuggestion[]) => void;
  onClose?: () => void;
};

type TabId = "suggest" | "bundle" | "library" | "selected";

const TAB_LABELS: Record<TabId, string> = {
  suggest: "Gợi ý",
  bundle: "Từ Bundle",
  library: "Thư viện",
  selected: "Đã chọn",
};

function mediaAssetToSuggestion(asset: MediaAsset): MediaAssetSuggestion {
  return {
    id: asset.id,
    url: asset.url,
    thumbnailUrl: asset.thumbnailUrl,
    title: asset.title,
    altText: asset.altText,
    library: null,
    role: null,
    orientation: asset.orientation,
    visibility: asset.visibility,
    score: 0,
    matchedOn: ["thư viện"],
    contentSuitabilities: asset.contentSuitabilities,
    seoScore: asset.seoScore,
    seoReadinessStatus: asset.seoReadinessStatus,
  };
}

function bundleAssetToSuggestion(
  asset: MediaBundleDetail["slots"][number]["assets"][number],
): MediaAssetSuggestion {
  return {
    id: asset.id,
    url: asset.url,
    thumbnailUrl: asset.thumbnailUrl,
    title: asset.title,
    altText: asset.altText,
    library: asset.library ? { code: asset.library, name: asset.library } : null,
    role: asset.role ? { code: asset.role, name: asset.role } : null,
    orientation: asset.orientation,
    visibility: asset.visibility,
    score: 0,
    matchedOn: ["bundle"],
    contentSuitabilities: asset.contentSuitabilities,
    seoScore: asset.seoScore,
    seoReadinessStatus: asset.seoReadinessStatus,
  };
}

function slotMatchesPlacement(slotType: MediaBundleSlotType, targetPlacement: string): boolean {
  const mapped = mapBundleSlotToBlogPlacement(slotType);
  return mapped === targetPlacement;
}

export default function ContentMediaPicker({
  entityType,
  entityId,
  placement,
  multiple = false,
  query = "",
  bundleId,
  allowedSuitabilities,
  selectedAssetIds = [],
  onSelect,
  onClose,
}: ContentMediaPickerProps) {
  const [tab, setTab] = useState<TabId>("suggest");
  const [libraryAssets, setLibraryAssets] = useState<MediaAsset[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [librarySearch, setLibrarySearch] = useState("");
  const [bundle, setBundle] = useState<MediaBundleDetail | null>(null);
  const [bundleLoading, setBundleLoading] = useState(false);
  const [bundleError, setBundleError] = useState<string | null>(null);
  const [pickedAssets, setPickedAssets] = useState<Map<string, MediaAssetSuggestion>>(new Map());

  const discoveryQuery = query.trim();

  const bundleAssets = useMemo(() => {
    if (!bundle) return [];
    const items: Array<MediaAssetSuggestion & { slotLabel: string }> = [];
    for (const slot of bundle.slots) {
      if (!slotMatchesPlacement(slot.slotType, placement)) continue;
      for (const asset of slot.assets) {
        items.push({
          ...bundleAssetToSuggestion(asset),
          slotLabel: slot.label,
        });
      }
    }
    return items;
  }, [bundle, placement]);

  const loadLibrary = useCallback(async () => {
    setLibraryLoading(true);
    try {
      const params = new URLSearchParams({ folder: "blog" });
      if (librarySearch.trim()) params.set("search", librarySearch.trim());
      const res = await fetch(`/api/media?${params.toString()}`);
      const data = await res.json();
      setLibraryAssets(Array.isArray(data) ? data : []);
    } catch {
      setLibraryAssets([]);
    } finally {
      setLibraryLoading(false);
    }
  }, [librarySearch]);

  const loadBundle = useCallback(async () => {
    if (!bundleId) {
      setBundle(null);
      return;
    }
    setBundleLoading(true);
    setBundleError(null);
    try {
      const res = await fetch(`/api/content/media-bundles/${bundleId}/content`);
      const data = (await res.json()) as { bundle?: MediaBundleDetail; message?: string };
      if (!res.ok) throw new Error(data.message ?? "Không thể tải Bundle");
      setBundle(data.bundle ?? null);
    } catch (err) {
      setBundle(null);
      setBundleError(err instanceof Error ? err.message : "Không thể tải Bundle");
    } finally {
      setBundleLoading(false);
    }
  }, [bundleId]);

  useEffect(() => {
    if (tab === "library") void loadLibrary();
  }, [tab, loadLibrary]);

  useEffect(() => {
    if (tab === "bundle") void loadBundle();
  }, [tab, loadBundle]);

  function recordPick(asset: MediaAssetSuggestion) {
    setPickedAssets((prev) => new Map(prev).set(asset.id, asset));
  }

  function handlePick(asset: MediaAssetSuggestion) {
    if (selectedAssetIds.includes(asset.id)) return;
    recordPick(asset);
    onSelect([asset]);
    if (!multiple) onClose?.();
  }

  function isDisabled(assetId: string): boolean {
    return selectedAssetIds.includes(assetId);
  }

  return (
    <div className="admin-media-picker-overlay" onClick={() => onClose?.()}>
      <div
        className="admin-media-picker-modal"
        style={{ maxWidth: 720 }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="admin-media-picker-modal-header">
          <div>
            <h3 className="admin-subtitle" style={{ margin: 0 }}>
              Chọn media
            </h3>
            <p className="admin-field-hint" style={{ margin: "4px 0 0" }}>
              Vị trí: {placement}
              {entityId ? ` · ${entityType}` : ""}
            </p>
          </div>
          {onClose && (
            <button type="button" className="admin-media-picker-close" onClick={onClose}>
              ✕
            </button>
          )}
        </div>

        <div className="admin-toolbar" style={{ marginBottom: 12 }}>
          {(Object.keys(TAB_LABELS) as TabId[]).map((id) => (
            <button
              key={id}
              type="button"
              className={`admin-btn admin-btn--small ${tab === id ? "admin-btn--primary" : "admin-btn--secondary"}`}
              onClick={() => setTab(id)}
            >
              {TAB_LABELS[id]}
            </button>
          ))}
        </div>

        {tab === "suggest" && (
          <MediaSuggestionPanel
            query={discoveryQuery}
            contentSuitabilities={allowedSuitabilities}
            bundleContentType={entityType === "BLOG_POST" ? "BLOG_ARTICLE" : undefined}
            selectedIds={selectedAssetIds}
            multiple={multiple}
            showSortControl
            onSelect={(asset) => handlePick(asset)}
            onOpenLibrary={() => setTab("library")}
          />
        )}

        {tab === "bundle" && (
          <div>
            {!bundleId ? (
              <p className="admin-field-hint">Chưa có Bundle liên kết. Liên kết Bundle trước khi chọn từ đây.</p>
            ) : bundleLoading ? (
              <AdminLoadingState label="Đang tải Bundle…" rows={2} />
            ) : bundleError ? (
              <p className="admin-message admin-message--error">{bundleError}</p>
            ) : bundleAssets.length === 0 ? (
              <p className="admin-field-hint">Không có ảnh phù hợp vị trí {placement} trong Bundle.</p>
            ) : (
              <div
                className="admin-media-grid"
                style={{ gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))" }}
              >
                {bundleAssets.map((item) => (
                  <button
                    key={`${item.id}-${item.slotLabel}`}
                    type="button"
                    className={`admin-media-card admin-media-card--selectable ${isDisabled(item.id) ? "is-selected" : ""}`}
                    disabled={isDisabled(item.id)}
                    onClick={() => handlePick(item)}
                  >
                    <div className="admin-media-preview">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.thumbnailUrl ?? item.url} alt={item.altText ?? item.title ?? ""} />
                    </div>
                    <div className="admin-media-meta">
                      <p className="admin-field-hint">{item.slotLabel}</p>
                      {typeof item.seoScore === "number" && (
                        <p className="admin-field-hint">SEO {item.seoScore}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "library" && (
          <div>
            <div className="admin-toolbar" style={{ marginBottom: 12 }}>
              <input
                className="admin-input admin-input--inline"
                placeholder="Tìm ảnh blog…"
                value={librarySearch}
                onChange={(e) => setLibrarySearch(e.target.value)}
              />
              <button
                type="button"
                className="admin-btn admin-btn--secondary admin-btn--small"
                onClick={() => void loadLibrary()}
              >
                Tìm
              </button>
            </div>
            {libraryLoading ? (
              <AdminLoadingState label="Đang tải thư viện…" rows={3} />
            ) : libraryAssets.length === 0 ? (
              <p className="admin-empty-state">Không có ảnh trong thư mục blog.</p>
            ) : (
              <div className="admin-media-picker-grid">
                {libraryAssets.map((asset) => {
                  const suggestion = mediaAssetToSuggestion(asset);
                  return (
                    <button
                      key={asset.id}
                      type="button"
                      className={`admin-media-picker-item ${isDisabled(asset.id) ? "is-selected" : ""}`}
                      disabled={isDisabled(asset.id)}
                      onClick={() => handlePick(suggestion)}
                    >
                      <div className="admin-media-preview">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={asset.url} alt={asset.altText ?? asset.filename} />
                      </div>
                      <p className="admin-media-filename">{asset.filename}</p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab === "selected" && (
          <div>
            {selectedAssetIds.length === 0 && pickedAssets.size === 0 ? (
              <p className="admin-field-hint">Chưa chọn ảnh nào.</p>
            ) : (
              <ul className="admin-checkbox-list">
                {selectedAssetIds.map((id) => {
                  const asset = pickedAssets.get(id);
                  return (
                    <li key={id} className="admin-field-hint" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      {asset ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={asset.thumbnailUrl ?? asset.url}
                            alt=""
                            style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 4 }}
                          />
                          <span>{asset.title ?? asset.altText ?? id}</span>
                        </>
                      ) : (
                        <span>{id}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
