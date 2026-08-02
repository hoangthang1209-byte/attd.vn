"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminLoadingState } from "@/components/admin/AdminUi";

type PickerAsset = {
  id: string;
  url: string;
  thumbnailUrl?: string | null;
  title?: string | null;
  altText?: string | null;
  visibility?: string;
  library?: { code?: string | null } | null;
  role?: { code?: string | null } | null;
  seoScore?: number;
};

type BlogInlineMediaPickerDrawerProps = {
  open: boolean;
  sectionHeading?: string;
  usedMediaIds?: string[];
  onClose: () => void;
  onSelect: (mediaAssetId: string) => void;
};

/**
 * Lightweight PUBLIC media picker for replace/insert in the editor.
 * Reuses /api/media — private assets are filtered client-side as a guard.
 */
export default function BlogInlineMediaPickerDrawer({
  open,
  sectionHeading,
  usedMediaIds = [],
  onClose,
  onSelect,
}: BlogInlineMediaPickerDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [assets, setAssets] = useState<PickerAsset[]>([]);
  const [search, setSearch] = useState(sectionHeading ?? "");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ folder: "blog", limit: "48" });
      if (search.trim()) params.set("search", search.trim());
      const response = await fetch(`/api/media?${params.toString()}`);
      const data = await response.json();
      const rows = (Array.isArray(data) ? data : data.assets ?? []) as PickerAsset[];
      setAssets(
        rows.filter((asset) => !asset.visibility || asset.visibility === "PUBLIC"),
      );
    } catch {
      setAssets([]);
      setError("Không tải được thư viện ảnh.");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    if (!open) return;
    setSearch(sectionHeading ?? "");
  }, [open, sectionHeading]);

  useEffect(() => {
    if (!open) return;
    void load();
  }, [open, load]);

  if (!open) return null;

  return (
    <div className="admin-media-picker-overlay" onClick={onClose} role="presentation">
      <div
        className="admin-media-picker-modal blog-inline-media-picker"
        role="dialog"
        aria-modal="true"
        aria-label="Chọn ảnh nội dung"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="admin-media-picker-modal-header">
          <h3 className="admin-subtitle">Chọn ảnh PUBLIC từ thư viện</h3>
          <button type="button" className="admin-media-picker-close" onClick={onClose} aria-label="Đóng">
            ✕
          </button>
        </div>
        <div className="admin-toolbar">
          <input
            className="admin-input admin-input--inline"
            placeholder="Tìm theo tiêu đề / alt…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Tìm ảnh"
          />
          <button type="button" className="admin-btn admin-btn--secondary" onClick={() => void load()}>
            Tìm
          </button>
        </div>
        {error && <p className="admin-message admin-message--error">{error}</p>}
        {loading ? (
          <AdminLoadingState label="Đang tải…" rows={3} />
        ) : assets.length === 0 ? (
          <p className="admin-empty-state">Không tìm thấy ảnh phù hợp.</p>
        ) : (
          <div className="admin-media-picker-grid">
            {assets.map((asset) => {
              const used = usedMediaIds.includes(asset.id);
              return (
                <button
                  key={asset.id}
                  type="button"
                  className={`admin-media-picker-item ${used ? "is-used" : ""}`}
                  onClick={() => onSelect(asset.id)}
                >
                  <div className="admin-media-preview">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={asset.thumbnailUrl || asset.url} alt={asset.altText ?? asset.title ?? ""} />
                  </div>
                  <p className="admin-media-filename">
                    {asset.title || asset.altText || asset.id.slice(-8)}
                    {used ? " · đã dùng" : ""}
                  </p>
                  <p className="admin-field-hint">
                    {[asset.library?.code, asset.role?.code, asset.altText ? "có alt" : "thiếu alt"]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
