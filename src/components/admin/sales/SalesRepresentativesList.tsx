"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatCrmDateTime } from "@/features/crm/format";
import type { SalesRepresentativeRecord } from "@/features/sales/types";

export default function SalesRepresentativesList() {
  const router = useRouter();
  const [salesReps, setSalesReps] = useState<SalesRepresentativeRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`/api/admin/sales?${params}`);
      const data = (await res.json()) as {
        salesReps?: SalesRepresentativeRecord[];
        total?: number;
        message?: string;
      };
      if (!res.ok) throw new Error(data.message ?? "Không thể tải danh sách");
      setSalesReps(data.salesReps ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi tải dữ liệu");
      setSalesReps([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleToggleActive(id: string) {
    const res = await fetch(`/api/admin/sales/${id}/toggle-active`, { method: "POST" });
    if (res.ok) void load();
  }

  async function handleSetDefault(id: string) {
    const res = await fetch(`/api/admin/sales/${id}/default`, { method: "POST" });
    if (res.ok) void load();
  }

  return (
    <div className="admin-panel">
      <div className="admin-section-header">
        <p>Tổng: {total} nhân viên tư vấn</p>
        <Link href="/admin/crm/sales/new" className="admin-btn admin-btn--primary">
          Thêm nhân viên tư vấn
        </Link>
      </div>

      <form
        className="admin-crm-filters"
        onSubmit={(e) => {
          e.preventDefault();
          void load();
        }}
      >
        <input
          className="admin-input"
          placeholder="Tìm mã, tên, SĐT, email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="submit" className="admin-btn">
          Tìm kiếm
        </button>
      </form>

      {error && <p className="admin-error">{error}</p>}
      {loading && <p className="admin-loading">Đang tải...</p>}

      {!loading && salesReps.length === 0 && (
        <p className="admin-empty-state">Chưa có nhân viên tư vấn.</p>
      )}

      {!loading && salesReps.length > 0 && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Mã NV</th>
                <th>Tên nhân viên</th>
                <th>Chức vụ</th>
                <th>Số điện thoại</th>
                <th>Email</th>
                <th>Trạng thái</th>
                <th>Mặc định</th>
                <th>Ngày tạo</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {salesReps.map((rep) => (
                <tr key={rep.id}>
                  <td>{rep.code}</td>
                  <td>{rep.fullName}</td>
                  <td>{rep.title ?? "—"}</td>
                  <td>{rep.phone ?? "—"}</td>
                  <td>{rep.email ?? "—"}</td>
                  <td>{rep.isActive ? "Đang hoạt động" : "Ngưng sử dụng"}</td>
                  <td>{rep.isDefault ? "Có" : "—"}</td>
                  <td>{formatCrmDateTime(rep.createdAt)}</td>
                  <td className="admin-table-actions">
                    <button
                      type="button"
                      className="admin-btn admin-btn--small"
                      onClick={() => router.push(`/admin/crm/sales/${rep.id}`)}
                    >
                      Sửa
                    </button>
                    {!rep.isDefault && rep.isActive && (
                      <button
                        type="button"
                        className="admin-btn admin-btn--small"
                        onClick={() => void handleSetDefault(rep.id)}
                      >
                        Đặt mặc định
                      </button>
                    )}
                    <button
                      type="button"
                      className="admin-btn admin-btn--small"
                      onClick={() => void handleToggleActive(rep.id)}
                    >
                      {rep.isActive ? "Ngưng" : "Kích hoạt"}
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
