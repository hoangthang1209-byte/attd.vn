"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { MlCategory } from "@/components/admin/manufacturing-library/ManufacturingLibraryAdminTypes";

type FormState = {
  id?: string;
  parentId: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  sortOrder: number;
  active: boolean;
};

const blank: FormState = {
  parentId: "",
  name: "",
  slug: "",
  description: "",
  icon: "",
  sortOrder: 0,
  active: true,
};

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export default function ManufacturingCategoryManager({ categories }: { categories: MlCategory[] }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(blank);
  const [message, setMessage] = useState<string | null>(null);

  function edit(category: MlCategory) {
    setForm({
      id: category.id,
      parentId: category.parentId ?? "",
      name: category.name,
      slug: category.slug,
      description: category.description ?? "",
      icon: category.icon ?? "",
      sortOrder: category.sortOrder,
      active: category.active,
    });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const res = await fetch(
      form.id
        ? `/api/admin/manufacturing-library/categories/${form.id}`
        : "/api/admin/manufacturing-library/categories",
      {
        method: form.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, parentId: form.parentId || null }),
      },
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(data.message ?? "Lưu thất bại");
      return;
    }
    setForm(blank);
    setMessage("Đã lưu danh mục");
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("Xóa hoặc tắt danh mục này?")) return;
    await fetch(`/api/admin/manufacturing-library/categories/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="admin-panel">
      {message ? <p className="admin-message admin-message--success">{message}</p> : null}
      <form className="admin-form admin-form--compact" onSubmit={submit}>
        <div className="admin-form-grid">
          <input
            className="admin-input"
            placeholder="Tên danh mục"
            value={form.name}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                name: event.target.value,
                slug: current.slug || slugify(event.target.value),
              }))
            }
            required
          />
          <input
            className="admin-input"
            placeholder="slug"
            value={form.slug}
            onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
            required
          />
          <select
            className="admin-input"
            value={form.parentId}
            onChange={(event) => setForm((current) => ({ ...current, parentId: event.target.value }))}
          >
            <option value="">Không có danh mục cha</option>
            {categories
              .filter((category) => category.id !== form.id)
              .map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
          </select>
          <input
            className="admin-input"
            placeholder="Icon"
            value={form.icon}
            onChange={(event) => setForm((current) => ({ ...current, icon: event.target.value }))}
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
            {form.id ? "Cập nhật" : "Tạo danh mục"}
          </button>
          {form.id ? (
            <button type="button" onClick={() => setForm(blank)}>
              Hủy
            </button>
          ) : null}
        </div>
      </form>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Tên</th>
              <th>Slug</th>
              <th>Cha</th>
              <th>Active</th>
              <th>Tài sản</th>
              <th>Sort</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => (
              <tr key={category.id}>
                <td>{category.name}</td>
                <td><code>{category.slug}</code></td>
                <td>{category.parent?.name ?? "-"}</td>
                <td>{category.active ? "Có" : "Không"}</td>
                <td>{category._count?.assets ?? 0}</td>
                <td>{category.sortOrder}</td>
                <td>
                  <div className="admin-table-actions">
                    <button type="button" onClick={() => edit(category)}>Sửa</button>
                    <button type="button" onClick={() => remove(category.id)}>Xóa/Tắt</button>
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
