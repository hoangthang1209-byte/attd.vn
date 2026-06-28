"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AdminLoadingState,
  AdminPageShell,
  EmptyState,
  PageHeader,
} from "@/components/admin/AdminUi";

type TemplateRow = {
  id: string;
  code: string;
  name: string;
  baseSize: string | null;
  productCategory?: { name: string } | null;
  _count?: { items: number };
};

export default function MeasurementTemplateListManager() {
  const [items, setItems] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`/api/measurement-templates?${params.toString()}`);
      const data = (await res.json()) as { items?: TemplateRow[]; message?: string };
      if (!res.ok) throw new Error(data.message ?? "Không thể tải danh sách");
      setItems(data.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    const res = await fetch("/api/measurement-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    const data = (await res.json()) as { id?: string; message?: string };
    if (!res.ok) {
      setError(data.message ?? "Không thể tạo mẫu");
      return;
    }
    setCreating(false);
    setNewName("");
    if (data.id) window.location.href = `/admin/measurement-template/${data.id}`;
    else void load();
  }

  return (
    <AdminPageShell>
      <PageHeader
        title="Mẫu thông số đo"
        actions={
          <button type="button" className="admin-btn admin-btn--primary" onClick={() => setCreating(true)}>
            Tạo mẫu mới
          </button>
        }
      />

      {error && <p className="admin-error">{error}</p>}

      <form
        className="admin-filter-bar"
        onSubmit={(e) => {
          e.preventDefault();
          void load();
        }}
      >
        <input
          className="admin-input"
          placeholder="Tìm theo mã hoặc tên..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="submit" className="admin-btn">
          Tìm kiếm
        </button>
      </form>

      {creating && (
        <form className="admin-inline-form" onSubmit={(e) => void handleCreate(e)}>
          <input
            className="admin-input"
            placeholder="Tên mẫu thông số"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            autoFocus
          />
          <button type="submit" className="admin-btn admin-btn--primary">
            Tạo
          </button>
          <button type="button" className="admin-btn" onClick={() => setCreating(false)}>
            Hủy
          </button>
        </form>
      )}

      {loading ? (
        <AdminLoadingState label="Đang tải mẫu thông số..." />
      ) : items.length === 0 ? (
        <EmptyState title="Chưa có mẫu thông số" description="Tạo mẫu để tái sử dụng bảng đo cho Tech Pack và rập." />
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Mã</th>
              <th>Tên</th>
              <th>Nhóm SP</th>
              <th>Base size</th>
              <th>Số điểm đo</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>
                  <Link href={`/admin/measurement-template/${item.id}`} className="admin-link">
                    {item.code}
                  </Link>
                </td>
                <td>{item.name}</td>
                <td>{item.productCategory?.name ?? "—"}</td>
                <td>{item.baseSize ?? "—"}</td>
                <td>{item._count?.items ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </AdminPageShell>
  );
}
