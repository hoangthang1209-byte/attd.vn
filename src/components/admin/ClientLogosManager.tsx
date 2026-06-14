"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Logo = {
  id: string;
  companyName: string;
  website: string | null;
  imageUrl: string;
  isVisible: boolean;
};

type Message = { text: string; type: "success" | "error" };

export default function ClientLogosManager() {
  const router = useRouter();
  const [logos, setLogos] = useState<Logo[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    companyName: "",
    website: "",
    imageUrl: "",
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
    setMessage(null);
    const res = await fetch("/api/client-logos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage({ type: "error", text: data.message ?? "Tạo logo thất bại" });
      return;
    }
    setForm({ companyName: "", website: "", imageUrl: "", isVisible: true });
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
          />
        </div>
        <div className="admin-form-group">
          <label htmlFor="website">Website (tùy chọn)</label>
          <input
            id="website"
            className="admin-input"
            value={form.website}
            onChange={(e) => setForm((p) => ({ ...p, website: e.target.value }))}
          />
        </div>
        <div className="admin-form-group">
          <label htmlFor="imageUrl">URL ảnh (từ thư viện media)</label>
          <input
            id="imageUrl"
            className="admin-input"
            value={form.imageUrl}
            onChange={(e) => setForm((p) => ({ ...p, imageUrl: e.target.value }))}
            placeholder="/uploads/clients/... hoặc URL Blob"
            required
          />
          <p className="admin-field-hint">
            Tải ảnh tại Media Library, copy URL rồi dán vào đây.
          </p>
        </div>
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
        <p className="admin-loading">Đang tải...</p>
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
                <th>Công ty</th>
                <th>Website</th>
                <th>Hiển thị</th>
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
                <td>
                  <button
                    type="button"
                    onClick={() => toggleVisible(logo.id, !logo.isVisible)}
                  >
                    {logo.isVisible ? "Đang hiện" : "Đang ẩn"}
                  </button>
                </td>
                  <td>
                    <button
                      type="button"
                      className="admin-btn--danger"
                      onClick={() => handleDelete(logo.id)}
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
