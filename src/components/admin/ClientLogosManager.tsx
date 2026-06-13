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

export default function ClientLogosManager() {
  const router = useRouter();
  const [logos, setLogos] = useState<Logo[]>([]);
  const [form, setForm] = useState({
    companyName: "",
    website: "",
    imageUrl: "",
    isVisible: true,
  });
  const [message, setMessage] = useState("");

  async function load() {
    const res = await fetch("/api/client-logos");
    setLogos(await res.json());
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/client-logos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      setMessage("Tạo logo thất bại");
      return;
    }
    setForm({ companyName: "", website: "", imageUrl: "", isVisible: true });
    setMessage("Đã thêm logo");
    await load();
    router.refresh();
  }

  async function toggleVisible(id: string, isVisible: boolean) {
    await fetch(`/api/client-logos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isVisible }),
    });
    await load();
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Xóa logo này?")) return;
    await fetch(`/api/client-logos/${id}`, { method: "DELETE" });
    await load();
    router.refresh();
  }

  return (
    <div className="admin-panel">
      <form className="admin-form" onSubmit={handleCreate}>
        <h2 className="admin-subtitle">Thêm logo</h2>
        <div className="admin-form-group">
          <label>Tên công ty</label>
          <input
            className="admin-input"
            value={form.companyName}
            onChange={(e) => setForm((p) => ({ ...p, companyName: e.target.value }))}
            required
          />
        </div>
        <div className="admin-form-group">
          <label>Website (tùy chọn)</label>
          <input
            className="admin-input"
            value={form.website}
            onChange={(e) => setForm((p) => ({ ...p, website: e.target.value }))}
          />
        </div>
        <div className="admin-form-group">
          <label>URL ảnh (từ thư viện media)</label>
          <input
            className="admin-input"
            value={form.imageUrl}
            onChange={(e) => setForm((p) => ({ ...p, imageUrl: e.target.value }))}
            required
          />
        </div>
        <label className="admin-checkbox">
          <input
            type="checkbox"
            checked={form.isVisible}
            onChange={(e) => setForm((p) => ({ ...p, isVisible: e.target.checked }))}
          />
          Hiển thị công khai
        </label>
        <button type="submit" className="btn-primary">Thêm logo</button>
      </form>

      {message && <p className="admin-message">{message}</p>}

      <div className="admin-table-wrap" style={{ marginTop: 32 }}>
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
                  <button type="button" onClick={() => handleDelete(logo.id)}>
                    Xóa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
