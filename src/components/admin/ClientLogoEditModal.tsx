"use client";

import { useEffect, useState } from "react";
import MediaPicker, { type MediaPickerValue } from "@/components/admin/MediaPicker";

export type ClientLogoFormData = {
  companyName: string;
  website: string;
  isVisible: boolean;
};

type Logo = {
  id: string;
  imageUrl: string;
  companyName: string;
  website: string | null;
  isVisible: boolean;
};

type Props = {
  logo: Logo | null;
  onClose: () => void;
  onSaved: () => void;
  onError: () => void;
};

function imageUrlToPickerValue(imageUrl: string): MediaPickerValue {
  const filename = imageUrl.split("/").pop()?.split("?")[0] ?? "logo";
  return { id: `existing-${filename}`, url: imageUrl, filename };
}

function isValidWebsite(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export default function ClientLogoEditModal({ logo, onClose, onSaved, onError }: Props) {
  const [form, setForm] = useState<ClientLogoFormData>({
    companyName: "",
    website: "",
    isVisible: true,
  });
  const [selectedImage, setSelectedImage] = useState<MediaPickerValue | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!logo) return;
    setForm({
      companyName: logo.companyName,
      website: logo.website ?? "",
      isVisible: logo.isVisible,
    });
    setSelectedImage(imageUrlToPickerValue(logo.imageUrl));
    setError("");
  }, [logo]);

  if (!logo) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!logo) return;
    setError("");

    if (!form.companyName.trim()) {
      setError("Tên công ty là bắt buộc");
      return;
    }
    if (form.companyName.trim().length < 2) {
      setError("Tên công ty phải có ít nhất 2 ký tự");
      return;
    }
    if (!selectedImage?.url) {
      setError("Vui lòng chọn logo");
      return;
    }
    if (!isValidWebsite(form.website)) {
      setError("Website không hợp lệ");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/client-logos/${logo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: form.companyName.trim(),
          website: form.website.trim() || null,
          imageUrl: selectedImage.url,
          isVisible: form.isVisible,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Không thể cập nhật đối tác");
        onError();
        return;
      }
      onSaved();
      onClose();
    } catch {
      setError("Không thể kết nối máy chủ");
      onError();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-media-picker-overlay" role="presentation" onClick={onClose}>
      <div
        className="admin-edit-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Sửa logo đối tác"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="admin-media-picker-modal-header">
          <h3 className="admin-subtitle">Sửa đối tác</h3>
          <button type="button" className="admin-media-picker-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <form className="admin-edit-panel-form" onSubmit={handleSubmit}>
          <div className="admin-form-group">
            <label htmlFor="edit-companyName">Tên công ty</label>
            <input
              id="edit-companyName"
              className="admin-input"
              value={form.companyName}
              onChange={(e) => setForm((p) => ({ ...p, companyName: e.target.value }))}
              required
              minLength={2}
            />
          </div>

          <div className="admin-form-group">
            <label htmlFor="edit-website">Website (tùy chọn)</label>
            <input
              id="edit-website"
              className="admin-input"
              type="url"
              value={form.website}
              onChange={(e) => setForm((p) => ({ ...p, website: e.target.value }))}
              placeholder="https://"
            />
          </div>

          <MediaPicker
            value={selectedImage}
            onChange={setSelectedImage}
            folder="clients"
            label="Logo"
            required
          />

          <label className="admin-checkbox">
            <input
              type="checkbox"
              checked={form.isVisible}
              onChange={(e) => setForm((p) => ({ ...p, isVisible: e.target.checked }))}
            />
            Hiển thị công khai
          </label>

          {error && <p className="admin-message admin-message--error">{error}</p>}

          <div className="admin-edit-panel-actions">
            <button type="button" className="admin-btn" onClick={onClose} disabled={saving}>
              Hủy
            </button>
            <button type="submit" className="admin-btn admin-btn--primary" disabled={saving}>
              {saving ? "Đang lưu…" : "Lưu thay đổi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
