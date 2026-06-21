"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { DeliveryCarrierRecord } from "@/features/delivery/delivery-carrier.service";

export default function DeliveryCarriersList() {
  const router = useRouter();
  const [carriers, setCarriers] = useState<DeliveryCarrierRecord[]>([]);
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
      const res = await fetch(`/api/delivery-carriers?${params}`);
      const data = (await res.json()) as {
        deliveryCarriers?: DeliveryCarrierRecord[];
        total?: number;
        message?: string;
      };
      if (!res.ok) throw new Error(data.message ?? "Không thể tải danh sách");
      setCarriers(data.deliveryCarriers ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi tải dữ liệu");
      setCarriers([]);
    } finally {
      setLoading(false);
    }
  }, [search, activeOnly]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleToggleActive(id: string, isActive: boolean) {
    const res = await fetch(`/api/delivery-carriers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    if (res.ok) void load();
  }

  return (
    <div className="admin-panel">
      <div className="admin-section-header">
        <p>Tổng: {total} đơn vị vận chuyển</p>
        <Link href="/admin/delivery-carriers/new" className="admin-btn admin-btn--primary">
          Thêm đơn vị vận chuyển
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
          placeholder="Tìm mã, tên, tên viết tắt..."
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
      {loading && <p className="admin-loading">Đang tải...</p>}

      {!loading && carriers.length === 0 && (
        <p className="admin-empty-state">Chưa có đơn vị vận chuyển.</p>
      )}

      {!loading && carriers.length > 0 && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Mã đơn vị</th>
                <th>Tên đơn vị</th>
                <th>Tên viết tắt</th>
                <th>Mô tả</th>
                <th>Thứ tự</th>
                <th>Trạng thái</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {carriers.map((c) => (
                <tr key={c.id}>
                  <td>{c.carrierCode}</td>
                  <td>{c.name}</td>
                  <td>{c.shortName ?? "—"}</td>
                  <td>{c.description ?? "—"}</td>
                  <td>{c.sortOrder}</td>
                  <td>{c.isActive ? "Đang hoạt động" : "Ngưng sử dụng"}</td>
                  <td className="admin-table-actions">
                    <button
                      type="button"
                      className="admin-btn admin-btn--small"
                      onClick={() => router.push(`/admin/delivery-carriers/${c.id}/edit`)}
                    >
                      Sửa
                    </button>
                    <button
                      type="button"
                      className="admin-btn admin-btn--small"
                      onClick={() => void handleToggleActive(c.id, c.isActive)}
                    >
                      {c.isActive ? "Ngưng" : "Kích hoạt"}
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
