"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminLoadingState } from "@/components/admin/AdminUi";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { DeliveryMethodRecord } from "@/features/delivery/delivery-method.service";

export default function DeliveryMethodsList() {
  const router = useRouter();
  const [methods, setMethods] = useState<DeliveryMethodRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeOnly, setActiveOnly] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (activeOnly) params.set("active", "1");
      const res = await fetch(`/api/delivery-methods?${params}`);
      const data = (await res.json()) as {
        deliveryMethods?: DeliveryMethodRecord[];
        total?: number;
        message?: string;
      };
      if (!res.ok) throw new Error(data.message ?? "Không thể tải danh sách");
      setMethods(data.deliveryMethods ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi tải dữ liệu");
      setMethods([]);
    } finally {
      setLoading(false);
    }
  }, [search, activeOnly]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleToggleActive(id: string, isActive: boolean) {
    const res = await fetch(`/api/delivery-methods/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    if (res.ok) void load();
  }

  return (
    <div className="admin-panel">
      <div className="admin-section-header">
        <p>Tổng: {total} hình thức giao hàng</p>
        <Link href="/admin/delivery-methods/new" className="admin-btn admin-btn--primary">
          Thêm hình thức
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
          placeholder="Tìm mã, tên..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <label className="admin-checkbox-label">
          <input type="checkbox" checked={activeOnly} onChange={(e) => setActiveOnly(e.target.checked)} />
          Chỉ đang hoạt động
        </label>
        <button type="submit" className="admin-btn">Tìm kiếm</button>
      </form>

      {error && <p className="admin-error">{error}</p>}
      {loading && <AdminLoadingState label="Đang tải phương thức giao hàng…" rows={3} />}

      {!loading && methods.length === 0 && (
        <p className="admin-empty-state">Chưa có hình thức giao hàng.</p>
      )}

      {!loading && methods.length > 0 && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Mã</th>
                <th>Tên</th>
                <th>Mô tả</th>
                <th>Thứ tự</th>
                <th>Trạng thái</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {methods.map((m) => (
                <tr key={m.id}>
                  <td>{m.code}</td>
                  <td>{m.name}</td>
                  <td>{m.description ?? "—"}</td>
                  <td>{m.sortOrder}</td>
                  <td>{m.isActive ? "Đang hoạt động" : "Ngưng sử dụng"}</td>
                  <td className="admin-table-actions">
                    <button
                      type="button"
                      className="admin-btn admin-btn--small"
                      onClick={() => router.push(`/admin/delivery-methods/${m.id}/edit`)}
                    >
                      Sửa
                    </button>
                    <button
                      type="button"
                      className="admin-btn admin-btn--small"
                      onClick={() => void handleToggleActive(m.id, m.isActive)}
                    >
                      {m.isActive ? "Ngưng" : "Kích hoạt"}
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
