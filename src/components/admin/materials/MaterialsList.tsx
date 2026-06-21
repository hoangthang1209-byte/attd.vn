"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { MaterialType } from "@prisma/client";
import { MATERIAL_TYPE_LABELS } from "@/features/materials/material-labels";
import { WAREHOUSE_STATUS_LABELS } from "@/features/materials/material-labels";

type MaterialRow = {
  id: string;
  materialCode: string;
  name: string;
  materialType: MaterialType;
  unit: string;
  reorderPoint: string | null;
  isActive: boolean;
  warehouseBalance: {
    onHandQuantity: string;
    availableQuantity: string;
  } | null;
};

export default function MaterialsList() {
  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeOnly, setActiveOnly] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (activeOnly) params.set("active", "1");
    const res = await fetch(`/api/materials?${params}`);
    const data = (await res.json()) as { materials?: MaterialRow[] };
    setMaterials(data.materials ?? []);
    setLoading(false);
  }, [search, activeOnly]);

  useEffect(() => {
    void load();
  }, [load]);

  function warehouseLabel(m: MaterialRow): string {
    if (!m.warehouseBalance) return WAREHOUSE_STATUS_LABELS.undeclared;
    const available = Number(m.warehouseBalance.availableQuantity);
    const reorder = m.reorderPoint ? Number(m.reorderPoint) : null;
    if (available <= 0) return WAREHOUSE_STATUS_LABELS.shortage;
    if (reorder != null && available <= reorder) return WAREHOUSE_STATUS_LABELS.low;
    return WAREHOUSE_STATUS_LABELS.enough;
  }

  return (
    <div>
      <div className="admin-toolbar" style={{ marginBottom: 16 }}>
        <input
          className="admin-input"
          placeholder="Tìm mã, tên vật tư…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <label className="admin-checkbox-label">
          <input type="checkbox" checked={activeOnly} onChange={(e) => setActiveOnly(e.target.checked)} />
          Chỉ vật tư đang dùng
        </label>
        <Link href="/admin/materials/new" className="admin-btn admin-btn--primary">
          Thêm vật tư
        </Link>
      </div>

      {loading ? (
        <p className="admin-field-hint">Đang tải…</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Mã</th>
                <th>Tên</th>
                <th>Loại</th>
                <th>ĐVT</th>
                <th>Tồn kho</th>
                <th>Khả dụng</th>
                <th>Điểm mua</th>
                <th>Trạng thái</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {materials.map((m) => (
                <tr key={m.id}>
                  <td>{m.materialCode}</td>
                  <td>{m.name}</td>
                  <td>{MATERIAL_TYPE_LABELS[m.materialType]}</td>
                  <td>{m.unit}</td>
                  <td>{m.warehouseBalance?.onHandQuantity ?? "—"}</td>
                  <td>{m.warehouseBalance?.availableQuantity ?? "—"}</td>
                  <td>{m.reorderPoint ?? "—"}</td>
                  <td>{warehouseLabel(m)}</td>
                  <td>
                    <Link href={`/admin/materials/${m.id}/edit`} className="admin-btn admin-btn--secondary admin-btn--xs">
                      Sửa
                    </Link>
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
