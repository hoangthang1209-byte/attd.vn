"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminLoadingState } from "@/components/admin/AdminUi";
import MediaPicker, { type MediaPickerValue } from "@/components/admin/MediaPicker";
import ClientLogoEditModal from "@/components/admin/ClientLogoEditModal";

type Logo = {
  id: string;
  companyName: string;
  website: string | null;
  imageUrl: string;
  isVisible: boolean;
  createdAt: string;
};

type Message = { text: string; type: "success" | "error" };

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

function formatCreatedAt(iso: string): string {
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function ClientLogosManager() {
  const router = useRouter();
  const [logos, setLogos] = useState<Logo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<MediaPickerValue | null>(null);
  const [editingLogo, setEditingLogo] = useState<Logo | null>(null);
  const [form, setForm] = useState({
    companyName: "",
    website: "",
    isVisible: true,
  });
  const [message, setMessage] = useState<Message | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/client-logos");
      const data = await res.json();
      setLogos(Array.isArray(data) ? data : []);
    } catch {
      setMessage({ type: "error", text: "Không thể tải danh sách logo" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.companyName.trim()) {
      setMessage({ type: "error", text: "Tên công ty là bắt buộc" });
      return;
    }
    if (form.companyName.trim().length < 2) {
      setMessage({ type: "error", text: "Tên công ty phải có ít nhất 2 ký tự" });
      return;
    }
    if (!selectedImage?.url) {
      setMessage({ type: "error", text: "Vui lòng chọn ảnh logo" });
      return;
    }
    if (!isValidWebsite(form.website)) {
      setMessage({ type: "error", text: "Website không hợp lệ" });
      return;
    }

    setMessage(null);
    const res = await fetch("/api/client-logos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        imageUrl: selectedImage.url,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage({ type: "error", text: data.message ?? "Tạo logo thất bại" });
      return;
    }
    setForm({ companyName: "", website: "", isVisible: true });
    setSelectedImage(null);
    setMessage({ type: "success", text: "Đã thêm logo — cập nhật trên trang chủ nếu bật hiển thị" });
    await load();
    router.refresh();
  }

  async function toggleVisible(id: string, isVisible: boolean) {
    const res = await fetch(`/api/client-logos/${id}`, {
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
      text: isVisible ? "Logo đang hiển thị trên trang chủ" : "Logo đã ẩn",
    });
    await load();
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Xóa logo này?")) return;
    const res = await fetch(`/api/client-logos/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setMessage({ type: "error", text: "Xóa thất bại" });
      return;
    }
    setMessage({ type: "success", text: "Đã xóa logo" });
    await load();
    router.refresh();
  }

  function handleEditSaved() {
    setMessage({ type: "success", text: "✓ Đã cập nhật đối tác" });
    void load();
    router.refresh();
  }

  function handleEditError() {
    setMessage({ type: "error", text: "Không thể cập nhật đối tác" });
  }

  return (
    <div className="admin-panel">
      <form className="admin-form" onSubmit={handleCreate}>
        <h2 className="admin-subtitle">Thêm logo</h2>
        <div className="admin-form-group">
          <label htmlFor="companyName">Tên công ty</label>
          <input
            id="companyName"
            className="admin-input"
            value={form.companyName}
            onChange={(e) => setForm((p) => ({ ...p, companyName: e.target.value }))}
            required
            minLength={2}
          />
        </div>
        <div className="admin-form-group">
          <label htmlFor="website">Website (tùy chọn)</label>
          <input
            id="website"
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
        <button type="submit" className="admin-btn admin-btn--primary">Thêm logo</button>
      </form>

      {message && (
        <p className={`admin-message admin-message--${message.type}`}>{message.text}</p>
      )}

      {loading ? (
        <AdminLoadingState label="Đang tải logo khách hàng…" />
      ) : logos.length === 0 ? (
        <div className="admin-empty-state">
          <p>Chưa có logo khách hàng.</p>
          <p className="admin-empty-hint">Thêm logo và bật hiển thị để xuất hiện trên trang chủ.</p>
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Logo</th>
                <th>Tên đối tác</th>
                <th>Website</th>
                <th>Trạng thái</th>
                <th>Ngày tạo</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {logos.map((logo) => (
                <tr key={logo.id}>
                  <td>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={logo.imageUrl} alt="" className="admin-thumb" />
                  </td>
                  <td>{logo.companyName}</td>
                  <td>{logo.website ?? "—"}</td>
                  <td>{logo.isVisible ? "Đang hiện" : "Đang ẩn"}</td>
                  <td>{formatCreatedAt(logo.createdAt)}</td>
                  <td>
                    <div className="admin-table-actions">
                      <button type="button" onClick={() => setEditingLogo(logo)}>
                        Sửa
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleVisible(logo.id, !logo.isVisible)}
                      >
                        {logo.isVisible ? "Ẩn" : "Hiện"}
                      </button>
                      <button
                        type="button"
                        className="admin-btn--danger"
                        onClick={() => handleDelete(logo.id)}
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

      <ClientLogoEditModal
        logo={editingLogo}
        onClose={() => setEditingLogo(null)}
        onSaved={handleEditSaved}
        onError={handleEditError}
      />
    </div>
  );
}
