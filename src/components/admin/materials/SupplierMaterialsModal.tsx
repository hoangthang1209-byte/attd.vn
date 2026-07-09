"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { SupplierMaterialLinkRecord } from "@/features/materials/material-supplier-link.service";
import AdminInlineLoader from "@/components/admin/feedback/AdminInlineLoader";

type Props = {
  supplierId: string;
  supplierName: string;
  onClose: () => void;
};

export default function SupplierMaterialsModal({ supplierId, supplierName, onClose }: Props) {
  const [materials, setMaterials] = useState<SupplierMaterialLinkRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/material-suppliers/${supplierId}/materials`);
    const data = (await res.json()) as { materials?: SupplierMaterialLinkRecord[] };
    setMaterials(data.materials ?? []);
    setLoading(false);
  }, [supplierId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="admin-modal-backdrop" role="presentation" onClick={onClose}>
      <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Vật tư đang cung cấp · {supplierName}</h3>
        {loading ? (
          <AdminInlineLoader message="Đang tải vật tư nhà cung cấp…" />
        ) : materials.length === 0 ? (
          <p className="admin-field-hint">Chưa liên kết vật tư nào.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table admin-table--compact">
              <thead>
                <tr>
                  <th>Mã vật tư</th>
                  <th>Tên</th>
                  <th>ĐVT</th>
                  <th>Mã NCC</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {materials.map((m) => (
                  <tr key={m.linkId}>
                    <td>{m.materialCode}</td>
                    <td>
                      {m.isPreferred && <span className="ops-urgency-badge ops-urgency--ok">Ưu tiên</span>}{" "}
                      {m.materialName}
                    </td>
                    <td>{m.unit}</td>
                    <td>{m.supplierMaterialCode ?? "—"}</td>
                    <td>
                      <Link href={`/admin/materials/${m.materialId}/edit`} className="admin-btn admin-btn--ghost admin-btn--small">
                        Sửa vật tư
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="admin-modal-actions">
          <button type="button" className="admin-btn admin-btn--secondary" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
