"use client";

import { useCallback, useEffect, useState } from "react";
import type { MediaAsset } from "@prisma/client";
import type { StorageFolderKey } from "@/lib/storage/types";
import { AdminLoadingState } from "@/components/admin/AdminUi";

type BlogEditorMediaInsertProps = {
  folder?: StorageFolderKey;
  onInsert: (url: string, altText: string) => void;
};

export default function BlogEditorMediaInsert({
  folder = "blog",
  onInsert,
}: BlogEditorMediaInsertProps) {
  const [open, setOpen] = useState(false);
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ folder });
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`/api/media?${params.toString()}`);
      const data = await res.json();
      setAssets(Array.isArray(data) ? data : []);
    } catch {
      setAssets([]);
    } finally {
      setLoading(false);
    }
  }, [folder, search]);

  useEffect(() => {
    if (!open) return;
    void load();
  }, [open, load]);

  function handleSelect(asset: MediaAsset) {
    const altText = asset.altText?.trim() || asset.filename.replace(/\.[^.]+$/, "");
    onInsert(asset.url, altText);
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        className="admin-visual-editor-tool"
        onClick={() => setOpen(true)}
      >
        Insert Image
      </button>

      {open && (
        <div className="admin-media-picker-overlay" onClick={() => setOpen(false)}>
          <div
            className="admin-media-picker-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="admin-media-picker-modal-header">
              <h3 className="admin-subtitle">Chèn ảnh từ thư viện</h3>
              <button
                type="button"
                className="admin-media-picker-close"
                onClick={() => setOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="admin-toolbar">
              <input
                className="admin-input admin-input--inline"
                placeholder="Tìm ảnh..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <button type="button" className="admin-btn admin-btn--secondary" onClick={() => void load()}>
                Tìm
              </button>
            </div>

            {loading ? (
              <AdminLoadingState label="Đang tải thư viện ảnh…" rows={3} />
            ) : assets.length === 0 ? (
              <p className="admin-empty-state">Không có ảnh trong thư mục blog.</p>
            ) : (
              <div className="admin-media-picker-grid">
                {assets.map((asset) => (
                  <button
                    key={asset.id}
                    type="button"
                    className="admin-media-picker-item"
                    onClick={() => handleSelect(asset)}
                  >
                    <div className="admin-media-preview">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={asset.url} alt={asset.altText ?? asset.filename} />
                    </div>
                    <p className="admin-media-filename">{asset.filename}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
