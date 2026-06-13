"use client";

import { useCallback, useEffect, useState } from "react";
import type { MediaAsset } from "@prisma/client";
import { MEDIA_TO_STORAGE_FOLDER } from "@/lib/storage/types";

const FOLDERS = [
  { value: "", label: "Tất cả" },
  { value: "products", label: "Products" },
  { value: "categories", label: "Categories" },
  { value: "clients", label: "Clients" },
  { value: "case-studies", label: "Case studies" },
];

export default function MediaLibraryClient() {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [folder, setFolder] = useState("");
  const [search, setSearch] = useState("");
  const [uploadFolder, setUploadFolder] = useState("clients");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (folder) params.set("folder", folder);
    if (search.trim()) params.set("search", search.trim());
    const res = await fetch(`/api/media?${params.toString()}`);
    const data = await res.json();
    setAssets(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [folder, search]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setMessage("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", uploadFolder);

    const res = await fetch("/api/media", { method: "POST", body: formData });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.message ?? "Upload thất bại");
      return;
    }
    setMessage("Đã tải lên thành công");
    e.target.value = "";
    await load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Xóa ảnh này?")) return;
    await fetch(`/api/media/${id}`, { method: "DELETE" });
    await load();
  }

  async function copyUrl(url: string) {
    await navigator.clipboard.writeText(url);
    setMessage("Đã copy URL");
  }

  return (
    <div className="admin-panel">
      <div className="admin-toolbar">
        <select value={folder} onChange={(e) => setFolder(e.target.value)}>
          {FOLDERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        <input
          type="search"
          placeholder="Tìm theo tên file..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="admin-input"
        />
        <select value={uploadFolder} onChange={(e) => setUploadFolder(e.target.value)}>
          {FOLDERS.filter((f) => f.value).map((f) => (
            <option key={f.value} value={f.value}>
              Upload → {f.label}
            </option>
          ))}
        </select>
        <label className="btn-primary admin-upload-btn">
          Tải ảnh lên
          <input type="file" accept="image/*" hidden onChange={handleUpload} />
        </label>
      </div>

      {message && <p className="admin-message">{message}</p>}
      {loading ? (
        <p>Đang tải...</p>
      ) : assets.length === 0 ? (
        <p className="admin-empty">Chưa có ảnh trong thư mục này.</p>
      ) : (
        <div className="admin-media-grid">
          {assets.map((asset) => (
            <div key={asset.id} className="admin-media-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={asset.url} alt={asset.altText ?? asset.filename} />
              <div className="admin-media-meta">
                <p className="admin-media-name">{asset.filename}</p>
                <p className="admin-media-folder">
                  {MEDIA_TO_STORAGE_FOLDER[asset.folder]}
                </p>
                <div className="admin-media-actions">
                  <button type="button" onClick={() => copyUrl(asset.url)}>
                    Copy URL
                  </button>
                  <button type="button" onClick={() => handleDelete(asset.id)}>
                    Xóa
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
