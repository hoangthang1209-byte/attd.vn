"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminLoadingState } from "@/components/admin/AdminUi";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import SupplierMaterialsModal from "@/components/admin/materials/SupplierMaterialsModal";
import type { MaterialSupplierRecord } from "@/features/materials/material-supplier.service";
import { withFromListParams } from "@/lib/admin/list-return";

export default function MaterialSuppliersList() {
  const searchParams = useSearchParams();
  const [suppliers, setSuppliers] = useState<MaterialSupplierRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [activeOnly, setActiveOnly] = useState(searchParams.get("active") === "1");
  const [materialsModal, setMaterialsModal] = useState<MaterialSupplierRecord | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (activeOnly) params.set("active", "1");
      const res = await fetch(`/api/material-suppliers?${params}`);
      const data = (await res.json()) as {
        suppliers?: MaterialSupplierRecord[];
        total?: number;
        message?: string;
      };
      if (!res.ok) throw new Error(data.message ?? "Không thể tải danh sách");
      setSuppliers(data.suppliers ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi tải dữ liệu");
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  }, [search, activeOnly]);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleActive(id: string, isActive: boolean) {
    const res = await fetch(`/api/material-suppliers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    if (res.ok) void load();
  }

  const newHref = withFromListParams("/admin/material-suppliers/new", searchParams);

  return (
    <div className="admin-panel">
      <div className="admin-section-header">
        <p>Tổng: {total} nhà cung cấp</p>
        <Link href={newHref} className="admin-btn admin-btn--primary">
          Thêm nhà cung cấp
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
          placeholder="Tìm mã, tên, liên hệ, SĐT, email..."
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
      {loading && <AdminLoadingState label="Đang tải nhà cung cấp vật tư…" rows={3} />}

      {!loading && suppliers.length === 0 && (
        <p className="admin-empty-state">Chưa có nhà cung cấp.</p>
      )}

      {!loading && suppliers.length > 0 && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Mã NCC</th>
                <th>Nhà cung cấp</th>
                <th>Người liên hệ</th>
                <th>Số điện thoại</th>
                <th>Email</th>
                <th>Số vật tư</th>
                <th>Trạng thái</th>
                <th>Cập nhật</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => (
                <tr key={s.id}>
                  <td><code>{s.supplierCode}</code></td>
                  <td>{s.name}{s.shortName ? ` (${s.shortName})` : ""}</td>
                  <td>{s.contactName ?? "—"}</td>
                  <td>{s.phone ?? "—"}</td>
                  <td>{s.email ?? "—"}</td>
                  <td>{s.materialCount}</td>
                  <td>{s.isActive ? "Đang hoạt động" : "Ngừng sử dụng"}</td>
                  <td>{new Date(s.updatedAt).toLocaleDateString("vi-VN")}</td>
                  <td>
                    <div className="admin-ops-row-actions">
                      <Link
                        href={withFromListParams(`/admin/material-suppliers/${s.id}/edit`, searchParams)}
                        className="admin-btn admin-btn--ghost admin-btn--small"
                      >
                        Sửa
                      </Link>
                      <button
                        type="button"
                        className="admin-btn admin-btn--ghost admin-btn--small"
                        onClick={() => setMaterialsModal(s)}
                      >
                        Xem vật tư
                      </button>
                      <button
                        type="button"
                        className="admin-btn admin-btn--ghost admin-btn--small"
                        onClick={() => void toggleActive(s.id, s.isActive)}
                      >
                        {s.isActive ? "Ngừng" : "Kích hoạt"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {materialsModal && (
        <SupplierMaterialsModal
          supplierId={materialsModal.id}
          supplierName={materialsModal.name}
          onClose={() => setMaterialsModal(null)}
        />
      )}
    </div>
  );
}
