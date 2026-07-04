"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { MlDisplayLocation } from "@/components/admin/manufacturing-library/ManufacturingLibraryAdminTypes";

type FormState = {
  id?: string;
  key: string;
  name: string;
  description: string;
  active: boolean;
  sortOrder: number;
};

const blank: FormState = { key: "", name: "", description: "", active: true, sortOrder: 0 };

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export default function ManufacturingDisplayLocationManager({
  displayLocations,
}: {
  displayLocations: MlDisplayLocation[];
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(blank);
  const [message, setMessage] = useState<string | null>(null);

  function edit(location: MlDisplayLocation) {
    setForm({
      id: location.id,
      key: location.key,
      name: location.name,
      description: location.description ?? "",
      active: location.active,
      sortOrder: location.sortOrder,
    });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const res = await fetch(
      form.id
        ? `/api/admin/manufacturing-library/display-locations/${form.id}`
        : "/api/admin/manufacturing-library/display-locations",
      {
        method: form.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      },
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(data.message ?? "Lưu thất bại");
      return;
    }
    setForm(blank);
    setMessage("Đã lưu vị trí hiển thị");
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("Xóa hoặc tắt vị trí hiển thị này?")) return;
    await fetch(`/api/admin/manufacturing-library/display-locations/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="admin-panel">
      {message ? <p className="admin-message admin-message--success">{message}</p> : null}
      <form className="admin-form admin-form--compact" onSubmit={submit}>
        <div className="admin-form-grid">
          <input
            className="admin-input"
            placeholder="Tên vị trí"
            value={form.name}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                name: event.target.value,
                key: current.key || slugify(event.target.value),
              }))
            }
            required
          />
          <input
            className="admin-input"
            placeholder="stable-key"
            value={form.key}
            onChange={(event) => setForm((current) => ({ ...current, key: event.target.value }))}
            required
          />
          <input
            className="admin-input"
            type="number"
            value={form.sortOrder}
            onChange={(event) =>
              setForm((current) => ({ ...current, sortOrder: Number(event.target.value) }))
            }
          />
          <label className="admin-checkbox-row">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))}
            />
            Active
          </label>
          <textarea
            className="admin-input admin-form-grid-span-2"
            rows={2}
            placeholder="Mô tả"
            value={form.description}
            onChange={(event) =>
              setForm((current) => ({ ...current, description: event.target.value }))
            }
          />
        </div>
        <div className="admin-form-actions">
          <button type="submit" className="btn-primary">
            {form.id ? "Cập nhật" : "Tạo vị trí"}
          </button>
          {form.id ? <button type="button" onClick={() => setForm(blank)}>Hủy</button> : null}
        </div>
      </form>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Tên</th>
              <th>Key</th>
              <th>Active</th>
              <th>Tài sản</th>
              <th>Sort</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {displayLocations.map((location) => (
              <tr key={location.id}>
                <td>{location.name}</td>
                <td><code>{location.key}</code></td>
                <td>{location.active ? "Có" : "Không"}</td>
                <td>{location._count?.assets ?? 0}</td>
                <td>{location.sortOrder}</td>
                <td>
                  <div className="admin-table-actions">
                    <button type="button" onClick={() => edit(location)}>Sửa</button>
                    <button type="button" onClick={() => remove(location.id)}>Xóa/Tắt</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
