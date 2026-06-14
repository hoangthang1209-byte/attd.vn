"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MediaPicker, { type MediaPickerValue } from "@/components/admin/MediaPicker";
import CaseStudyEditModal from "@/components/admin/CaseStudyEditModal";

type Study = {
  id: string;
  title: string;
  category: string;
  quantity: string;
  timeline: string;
  summary: string;
  imageUrl: string;
  isVisible: boolean;
};

type Message = { text: string; type: "success" | "error" };

export default function CaseStudiesManager() {
  const router = useRouter();
  const [studies, setStudies] = useState<Study[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<MediaPickerValue | null>(null);
  const [editingStudy, setEditingStudy] = useState<Study | null>(null);
  const [form, setForm] = useState({
    title: "",
    category: "",
    quantity: "",
    timeline: "",
    summary: "",
    isVisible: false,
  });
  const [message, setMessage] = useState<Message | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/case-studies");
      const data = await res.json();
      setStudies(Array.isArray(data) ? data : []);
    } catch {
      setMessage({ type: "error", text: "Không thể tải danh sách dự án" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedImage?.url) {
      setMessage({ type: "error", text: "Vui lòng chọn ảnh dự án" });
      return;
    }
    if (form.summary.trim().length < 20) {
      setMessage({ type: "error", text: "Tóm tắt phải có ít nhất 20 ký tự" });
      return;
    }

    setMessage(null);
    const res = await fetch("/api/case-studies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        imageUrl: selectedImage.url,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage({ type: "error", text: data.message ?? "Tạo dự án thất bại" });
      return;
    }
    setForm({
      title: "",
      category: "",
      quantity: "",
      timeline: "",
      summary: "",
      isVisible: false,
    });
    setSelectedImage(null);
    setMessage({ type: "success", text: "Đã thêm dự án" });
    await load();
    router.refresh();
  }

  async function toggleVisible(id: string, isVisible: boolean) {
    const res = await fetch(`/api/case-studies/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isVisible }),
    });
    if (!res.ok) {
      setMessage({ type: "error", text: "Cập nhật trạng thái thất bại" });
      return;
    }
    setMessage({
      type: "success",
      text: isVisible ? "Dự án đang hiển thị trên trang chủ" : "Dự án đã ẩn",
    });
    await load();
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Xóa dự án này?")) return;
    const res = await fetch(`/api/case-studies/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setMessage({ type: "error", text: "Xóa thất bại" });
      return;
    }
    setMessage({ type: "success", text: "Đã xóa dự án" });
    await load();
    router.refresh();
  }

  function handleEditSaved() {
    setMessage({ type: "success", text: "✓ Đã cập nhật case study" });
    void load();
    router.refresh();
  }

  return (
    <div className="admin-panel">
      <form className="admin-form" onSubmit={handleCreate}>
        <h2 className="admin-subtitle">Thêm dự án</h2>
        {(
          [
            ["title", "Tiêu đề"],
            ["category", "Ngành / loại hình"],
            ["quantity", "Số lượng"],
            ["timeline", "Thời gian"],
          ] as const
        ).map(([key, label]) => (
          <div key={key} className="admin-form-group">
            <label htmlFor={key}>{label}</label>
            <input
              id={key}
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
          <label htmlFor="summary">Tóm tắt</label>
          <textarea
            id="summary"
            className="admin-input admin-textarea"
            value={form.summary}
            onChange={(e) => setForm((p) => ({ ...p, summary: e.target.value }))}
            required
            minLength={20}
            rows={4}
          />
          <p className="admin-field-hint">Tối thiểu 20 ký tự</p>
        </div>
        <label className="admin-checkbox">
          <input
            type="checkbox"
            checked={form.isVisible}
            onChange={(e) => setForm((p) => ({ ...p, isVisible: e.target.checked }))}
          />
          Xuất bản (hiển thị công khai)
        </label>
        <button type="submit" className="admin-btn admin-btn--primary">Thêm dự án</button>
      </form>

      {message && (
        <p className={`admin-message admin-message--${message.type}`}>{message.text}</p>
      )}

      {loading ? (
        <p className="admin-loading">Đang tải...</p>
      ) : studies.length === 0 ? (
        <div className="admin-empty-state">
          <p>Chưa có dự án tiêu biểu.</p>
          <p className="admin-empty-hint">Thêm dự án và bật xuất bản để hiển thị trên trang chủ.</p>
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Ảnh</th>
                <th>Tiêu đề</th>
                <th>Category</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {studies.map((study) => (
                <tr key={study.id}>
                  <td>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={study.imageUrl} alt="" className="admin-thumb" />
                  </td>
                  <td>{study.title}</td>
                  <td>{study.category}</td>
                  <td>
                    <button
                      type="button"
                      onClick={() => toggleVisible(study.id, !study.isVisible)}
                    >
                      {study.isVisible ? "Hiện" : "Ẩn"}
                    </button>
                  </td>
                  <td>
                    <div className="admin-table-actions">
                      <button type="button" onClick={() => setEditingStudy(study)}>
                        Sửa
                      </button>
                      <button
                        type="button"
                        className="admin-btn--danger"
                        onClick={() => handleDelete(study.id)}
                      >
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CaseStudyEditModal
        study={editingStudy}
        onClose={() => setEditingStudy(null)}
        onSaved={handleEditSaved}
      />
    </div>
  );
}
