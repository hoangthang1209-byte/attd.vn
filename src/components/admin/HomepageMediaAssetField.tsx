"use client";

import { useCallback, useState } from "react";
import type { StorageFolderKey } from "@/lib/storage/types";

export type HomepageMediaValue = {
  mediaAssetId: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
};

type AssetPick = {
  id: string;
  url: string;
  thumbnailUrl?: string | null;
  filename: string;
  altText?: string | null;
};

type Props = {
  label?: string;
  folder?: StorageFolderKey;
  value: HomepageMediaValue;
  onChange: (value: HomepageMediaValue) => void;
  altLabel?: string;
  onAltChange?: (alt: string) => void;
};

export default function HomepageMediaAssetField({
  label = "Ảnh minh họa",
  folder = "general",
  value,
  onChange,
  altLabel = "Mô tả ảnh",
  onAltChange,
}: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [assets, setAssets] = useState<AssetPick[]>([]);
  const [loading, setLoading] = useState(false);

  const openPicker = useCallback(async () => {
    setPickerOpen(true);
    setLoading(true);
    try {
      const res = await fetch(`/api/media?folder=${folder}`);
      const data = await res.json();
      const list = (Array.isArray(data) ? data : []).map((raw: Record<string, unknown>) => ({
        id: String(raw.id),
        url: String(raw.url ?? ""),
        thumbnailUrl: raw.thumbnailUrl ? String(raw.thumbnailUrl) : null,
        filename: String(raw.filename ?? raw.originalName ?? "image"),
        altText: raw.altText ? String(raw.altText) : null,
      }));
      setAssets(list.filter((a) => a.url));
    } finally {
      setLoading(false);
    }
  }, [folder]);

  return (
    <div className="admin-form-group">
      <label>{label}</label>
      {value.imageUrl ? (
        <div className="homepage-media-field__preview">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value.imageUrl} alt={value.imageAlt ?? ""} className="homepage-media-field__thumb" />
          <p className="admin-field-hint">Đã chọn ảnh từ thư viện media.</p>
        </div>
      ) : (
        <p className="admin-field-hint">Chưa chọn ảnh — sẽ dùng minh họa CSS mặc định trên trang chủ.</p>
      )}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
        <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" onClick={() => void openPicker()}>
          Chọn ảnh
        </button>
        {value.mediaAssetId && (
          <button
            type="button"
            className="admin-btn admin-btn--secondary admin-btn--xs"
            onClick={() => onChange({ mediaAssetId: null, imageUrl: null, imageAlt: null })}
          >
            Gỡ ảnh
          </button>
        )}
      </div>
      {onAltChange && (
        <div style={{ marginTop: 8 }}>
          <label className="admin-label">{altLabel}</label>
          <input
            className="admin-input"
            value={value.imageAlt ?? ""}
            onChange={(e) => onAltChange(e.target.value)}
            placeholder="Để trống sẽ tự tạo từ tiêu đề"
          />
        </div>
      )}

      {pickerOpen && (
        <div className="admin-modal-overlay" onClick={() => setPickerOpen(false)}>
          <div className="admin-modal admin-modal--wide" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3 className="admin-subtitle">Chọn ảnh từ thư viện</h3>
              <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" onClick={() => setPickerOpen(false)}>
                Đóng
              </button>
            </div>
            {loading ? (
              <p className="admin-field-hint">Đang tải…</p>
            ) : (
              <div className="admin-media-grid admin-media-grid--picker">
                {assets.map((asset) => (
                  <button
                    key={asset.id}
                    type="button"
                    className="admin-media-card admin-media-card--selectable"
                    onClick={() => {
                      onChange({
                        mediaAssetId: asset.id,
                        imageUrl: asset.thumbnailUrl ?? asset.url,
                        imageAlt: asset.altText ?? null,
                      });
                      setPickerOpen(false);
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={asset.thumbnailUrl ?? asset.url} alt="" className="admin-media-card__thumb" />
                    <p className="admin-media-filename">{asset.filename}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
