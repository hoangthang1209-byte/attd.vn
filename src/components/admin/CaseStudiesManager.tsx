"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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

export default function CaseStudiesManager() {
  const router = useRouter();
  const [studies, setStudies] = useState<Study[]>([]);
  const [form, setForm] = useState({
    title: "",
    category: "",
    quantity: "",
    timeline: "",
    summary: "",
    imageUrl: "",
    isVisible: false,
  });
  const [message, setMessage] = useState("");

  async function load() {
    const res = await fetch("/api/case-studies");
    setStudies(await res.json());
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/case-studies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      setMessage("Tạo dự án thất bại");
      return;
    }
    setForm({
      title: "",
      category: "",
      quantity: "",
      timeline: "",
      summary: "",
      imageUrl: "",
      isVisible: false,
    });
    setMessage("Đã thêm dự án");
    await load();
    router.refresh();
  }

  async function toggleVisible(id: string, isVisible: boolean) {
    await fetch(`/api/case-studies/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isVisible }),
    });
    await load();
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Xóa dự án này?")) return;
    await fetch(`/api/case-studies/${id}`, { method: "DELETE" });
    await load();
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
            ["imageUrl", "URL ảnh"],
          ] as const
        ).map(([key, label]) => (
          <div key={key} className="admin-form-group">
            <label>{label}</label>
            <input
              className="admin-input"
              value={form[key]}
              onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
              required
            />
          </div>
        ))}
        <div className="admin-form-group">
          <label>Tóm tắt</label>
          <textarea
            className="admin-input admin-textarea"
            value={form.summary}
            onChange={(e) => setForm((p) => ({ ...p, summary: e.target.value }))}
            required
            rows={4}
          />
        </div>
        <label className="admin-checkbox">
          <input
            type="checkbox"
            checked={form.isVisible}
            onChange={(e) => setForm((p) => ({ ...p, isVisible: e.target.checked }))}
          />
          Xuất bản (hiển thị công khai)
        </label>
        <button type="submit" className="btn-primary">Thêm dự án</button>
      </form>

      {message && <p className="admin-message">{message}</p>}

      <div className="admin-table-wrap" style={{ marginTop: 32 }}>
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
                    {study.isVisible ? "Published" : "Hidden"}
                  </button>
                </td>
                <td>
                  <button type="button" onClick={() => handleDelete(study.id)}>
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
