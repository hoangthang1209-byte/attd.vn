"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AdminLoadingState,
  AdminPageShell,
  EmptyState,
  PageHeader,
} from "@/components/admin/AdminUi";
import { PatternStatusBadge } from "@/components/admin/tech-pack/TechPackEntityStatusBadge";
import type { PatternStatus } from "@prisma/client";
import { patternAdminDetailPath } from "@/features/patterns/pattern-admin-routes";

type PatternRow = {
  id: string;
  code: string;
  name: string;
  version: number;
  baseSize: string | null;
  sizeRange: string | null;
  status: PatternStatus;
  createdBy: string | null;
  approvedBy: string | null;
  productCategory?: { name: string } | null;
};

export default function PatternListManager() {
  const [items, setItems] = useState<PatternRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`/api/patterns?${params.toString()}`);
      const data = (await res.json()) as { items?: PatternRow[]; message?: string };
      if (!res.ok) throw new Error(data.message ?? "Không thể tải danh sách rập");
      setItems(data.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [statusFilter]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    const res = await fetch("/api/patterns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    const data = (await res.json()) as { id?: string; message?: string };
    if (!res.ok) {
      setError(data.message ?? "Không thể tạo rập");
      return;
    }
    setCreating(false);
    setNewName("");
    if (data.id) window.location.href = patternAdminDetailPath(data.id);
    else void load();
  }

  return (
    <AdminPageShell>
      <PageHeader
        title="Thư viện rập"
        actions={
          <button type="button" className="admin-btn admin-btn--primary" onClick={() => setCreating(true)}>
            Tạo rập
          </button>
        }
      />

      <div className="admin-data-toolbar" style={{ gap: 12, display: "flex", flexWrap: "wrap", marginBottom: 16 }}>
        <input
          className="admin-input"
          placeholder="Tìm mã hoặc tên rập..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void load()}
        />
        <select className="admin-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">Tất cả trạng thái</option>
          <option value="DRAFT">Bản nháp</option>
          <option value="APPROVED">Đã duyệt</option>
          <option value="ARCHIVED">Lưu trữ</option>
        </select>
        <button type="button" className="admin-btn" onClick={() => void load()}>
          Lọc
        </button>
      </div>

      {error && <p className="admin-error">{error}</p>}
      {loading ? (
        <AdminLoadingState label="Đang tải thư viện rập..." />
      ) : items.length === 0 ? (
        <EmptyState title="Chưa có rập" description="Tạo rập đầu tiên để dùng trong Tech Pack." />
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Mã rập</th>
                <th>Tên rập</th>
                <th>Version</th>
                <th>Base size</th>
                <th>Size range</th>
                <th>Trạng thái</th>
                <th>Người tạo</th>
                <th>Người duyệt</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id}>
                  <td>{row.code}</td>
                  <td>{row.name}</td>
                  <td>{row.version}</td>
                  <td>{row.baseSize ?? "—"}</td>
                  <td>{row.sizeRange ?? "—"}</td>
                  <td>
                    <PatternStatusBadge status={row.status} />
                  </td>
                  <td>{row.createdBy ?? "—"}</td>
                  <td>{row.approvedBy ?? "—"}</td>
                  <td>
                    <Link href={patternAdminDetailPath(row.id)} className="admin-link">
                      Chi tiết
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {creating && (
        <div className="admin-modal-backdrop">
          <form className="admin-modal" onSubmit={(e) => void handleCreate(e)}>
            <h3>Tạo rập</h3>
            <label className="admin-field">
              <span>Tên rập</span>
              <input className="admin-input" value={newName} onChange={(e) => setNewName(e.target.value)} required />
            </label>
            <div className="admin-modal__actions">
              <button type="button" className="admin-btn" onClick={() => setCreating(false)}>
                Hủy
              </button>
              <button type="submit" className="admin-btn admin-btn--primary">
                Tạo rập
              </button>
            </div>
          </form>
        </div>
      )}
    </AdminPageShell>
  );
}
