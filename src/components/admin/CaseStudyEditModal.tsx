"use client";

import { useEffect, useState } from "react";
import MediaPicker, { type MediaPickerValue } from "@/components/admin/MediaPicker";

export type CaseStudyFormData = {
  title: string;
  category: string;
  quantity: string;
  timeline: string;
  summary: string;
  isVisible: boolean;
};

type Study = CaseStudyFormData & {
  id: string;
  imageUrl: string;
};

type Props = {
  study: Study | null;
  onClose: () => void;
  onSaved: () => void;
};

function imageUrlToPickerValue(imageUrl: string): MediaPickerValue {
  const filename = imageUrl.split("/").pop()?.split("?")[0] ?? "image";
  return { id: `existing-${filename}`, url: imageUrl, filename };
}

export default function CaseStudyEditModal({ study, onClose, onSaved }: Props) {
  const [form, setForm] = useState<CaseStudyFormData>({
    title: "",
    category: "",
    quantity: "",
    timeline: "",
    summary: "",
    isVisible: false,
  });
  const [selectedImage, setSelectedImage] = useState<MediaPickerValue | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!study) return;
    setForm({
      title: study.title,
      category: study.category,
      quantity: study.quantity,
      timeline: study.timeline,
      summary: study.summary,
      isVisible: study.isVisible,
    });
    setSelectedImage(imageUrlToPickerValue(study.imageUrl));
    setError("");
  }, [study]);

  if (!study) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!study) return;
    setError("");

    if (!form.title.trim()) {
      setError("Tiêu đề là bắt buộc");
      return;
    }
    if (!selectedImage?.url) {
      setError("Vui lòng chọn ảnh dự án");
      return;
    }
    if (form.summary.trim().length < 20) {
      setError("Tóm tắt phải có ít nhất 20 ký tự");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/case-studies/${study.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          imageUrl: selectedImage.url,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Cập nhật thất bại");
        return;
      }
      onSaved();
      onClose();
    } catch {
      setError("Không thể kết nối máy chủ");
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
        aria-label="Sửa dự án tiêu biểu"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="admin-media-picker-modal-header">
          <h3 className="admin-subtitle">Sửa dự án</h3>
          <button type="button" className="admin-media-picker-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <form className="admin-edit-panel-form" onSubmit={handleSubmit}>
          {(
            [
              ["title", "Tiêu đề"],
              ["category", "Ngành / loại hình"],
              ["quantity", "Số lượng"],
              ["timeline", "Thời gian"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="admin-form-group">
              <label htmlFor={`edit-${key}`}>{label}</label>
              <input
                id={`edit-${key}`}
                className="admin-input"
                value={form[key]}
                onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                required
              />
            </div>
          ))}

          <MediaPicker
            value={selectedImage}
            onChange={setSelectedImage}
            folder="case-studies"
            label="Ảnh dự án"
            required
          />

          <div className="admin-form-group">
            <label htmlFor="edit-summary">Tóm tắt</label>
            <textarea
              id="edit-summary"
              className="admin-input admin-textarea"
              value={form.summary}
              onChange={(e) => setForm((p) => ({ ...p, summary: e.target.value }))}
              required
              minLength={20}
              rows={4}
            />
            <p className="admin-field-hint">Tối thiểu 20 ký tự ({form.summary.trim().length}/20)</p>
          </div>

          <label className="admin-checkbox">
            <input
              type="checkbox"
              checked={form.isVisible}
              onChange={(e) => setForm((p) => ({ ...p, isVisible: e.target.checked }))}
            />
            Xuất bản (hiển thị công khai)
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
