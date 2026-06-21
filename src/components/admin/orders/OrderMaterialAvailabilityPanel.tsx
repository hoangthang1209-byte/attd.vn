"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { MaterialAvailabilityRow } from "@/features/materials/material-availability.service";
import { useAdminMutation } from "@/hooks/useAdminAction";
import { parseAdminJsonResponse } from "@/lib/admin/adminMutation";

type MaterialOption = {
  id: string;
  materialCode: string;
  name: string;
  unit: string;
};

type Props = {
  orderId: string;
};

export default function OrderMaterialAvailabilityPanel({ orderId }: Props) {
  const mutate = useAdminMutation();
  const [rows, setRows] = useState<MaterialAvailabilityRow[]>([]);
  const [materials, setMaterials] = useState<MaterialOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [linkTarget, setLinkTarget] = useState<string | null>(null);
  const [selectedMaterialId, setSelectedMaterialId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/material-availability`);
      const parsed = await parseAdminJsonResponse(res, (body) => ({
        rows: (body.rows ?? []) as MaterialAvailabilityRow[],
      }));
      if (parsed.ok) setRows(parsed.data.rows);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    void load();
    void fetch("/api/materials?active=1&limit=200")
      .then((r) => r.json())
      .then((data: { materials?: MaterialOption[] }) => setMaterials(data.materials ?? []));
  }, [load]);

  async function reserve(materialId: string) {
    await mutate({
      loadingMessage: "Đang giữ vật tư…",
      successMessage: "Đã giữ vật tư cho đơn.",
      action: async () => {
        const res = await fetch(`/api/orders/${orderId}/material-allocations`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ materialId, action: "reserve" }),
        });
        return parseAdminJsonResponse(res, (body) => ({
          availability: (body.availability ?? []) as MaterialAvailabilityRow[],
        }));
      },
      onSuccess: (data) => setRows(data.availability),
    });
  }

  async function issue(materialId: string) {
    await mutate({
      loadingMessage: "Đang cấp vật tư…",
      successMessage: "Đã cấp vật tư cho sản xuất.",
      action: async () => {
        const res = await fetch(`/api/orders/${orderId}/material-allocations`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ materialId, action: "issue" }),
        });
        return parseAdminJsonResponse(res, (body) => ({
          availability: (body.availability ?? []) as MaterialAvailabilityRow[],
        }));
      },
      onSuccess: (data) => setRows(data.availability),
    });
  }

  async function createPurchaseRequest() {
    await mutate({
      loadingMessage: "Đang tạo yêu cầu mua…",
      successMessage: "Đã tạo yêu cầu mua hàng.",
      action: async () => {
        const res = await fetch(`/api/orders/${orderId}/purchase-request`, { method: "POST" });
        return parseAdminJsonResponse(res, (body) => ({
          requestId: (body.request as { id: string } | undefined)?.id ?? null,
        }));
      },
      onSuccess: (data) => {
        if (data.requestId) {
          window.open(`/admin/purchase-requests/${data.requestId}`, "_blank");
        }
        void load();
      },
    });
  }

  async function linkMaterial(requirementId: string) {
    if (!selectedMaterialId) return;
    await mutate({
      loadingMessage: "Đang liên kết vật tư…",
      successMessage: "Đã liên kết vật tư.",
      action: async () => {
        const res = await fetch(`/api/orders/${orderId}/purchase-request`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "link-material",
            orderMaterialRequirementId: requirementId,
            materialId: selectedMaterialId,
          }),
        });
        return parseAdminJsonResponse(res, (body) => ({
          rows: (body.rows ?? []) as MaterialAvailabilityRow[],
        }));
      },
      onSuccess: (data) => {
        setRows(data.rows);
        setLinkTarget(null);
        setSelectedMaterialId("");
      },
    });
  }

  if (loading) return <p className="admin-field-hint">Đang tải khả dụng nguyên phụ liệu…</p>;

  if (rows.length === 0) {
    return <p className="admin-field-hint">Chưa có dữ liệu nguyên phụ liệu cho đơn hàng này.</p>;
  }

  return (
    <div className="order-material-availability">
      <div style={{ marginBottom: 12 }}>
        <button
          type="button"
          className="admin-btn admin-btn--secondary admin-btn--small"
          onClick={() => void createPurchaseRequest()}
        >
          Tạo yêu cầu mua từ thiếu hụt
        </button>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table admin-table--compact">
          <thead>
            <tr>
              <th>Vật tư</th>
              <th>Cần</th>
              <th>Tồn</th>
              <th>Đã giữ</th>
              <th>Khả dụng</th>
              <th>Thiếu</th>
              <th>Trạng thái</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.aggregateKey}>
                <td>
                  <strong>{row.materialName}</strong>
                  {row.materialCode ? <div className="admin-field-hint">{row.materialCode}</div> : null}
                </td>
                <td>{row.requiredQuantity} {row.unit}</td>
                <td>{row.onHandQuantity ?? "—"}</td>
                <td>{row.allocatedQuantity ?? row.reservedQuantity ?? "—"}</td>
                <td>{row.availableQuantity ?? "—"}</td>
                <td>{row.shortageQuantity ?? "—"}</td>
                <td>{row.readinessLabel}</td>
                <td>
                  <div className="admin-ops-row-actions">
                    {!row.materialId && row.orderMaterialRequirementIds[0] ? (
                      <button
                        type="button"
                        className="admin-btn admin-btn--secondary admin-btn--xs"
                        onClick={() => setLinkTarget(row.orderMaterialRequirementIds[0]!)}
                      >
                        Liên kết
                      </button>
                    ) : null}
                    {row.materialId && row.warehouseStatus === "UNKNOWN" ? (
                      <Link
                        href={`/admin/materials/warehouse?materialId=${row.materialId}`}
                        className="admin-btn admin-btn--secondary admin-btn--xs"
                      >
                        Khai báo tồn
                      </Link>
                    ) : null}
                    {row.materialId && ["ENOUGH", "SHORTAGE"].includes(row.warehouseStatus) ? (
                      <button
                        type="button"
                        className="admin-btn admin-btn--secondary admin-btn--xs"
                        onClick={() => void reserve(row.materialId!)}
                      >
                        Giữ
                      </button>
                    ) : null}
                    {row.materialId && ["ENOUGH", "SHORTAGE", "RESERVED"].includes(row.warehouseStatus) ? (
                      <button
                        type="button"
                        className="admin-btn admin-btn--secondary admin-btn--xs"
                        onClick={() => void issue(row.materialId!)}
                      >
                        Cấp SX
                      </button>
                    ) : null}
                    {row.warehouseStatus === "SHORTAGE" ? (
                      <button
                        type="button"
                        className="admin-btn admin-btn--secondary admin-btn--xs"
                        onClick={() => void createPurchaseRequest()}
                      >
                        YC mua
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {linkTarget ? (
        <div className="admin-modal-backdrop" role="presentation">
          <div className="admin-modal">
            <h3>Liên kết vật tư danh mục</h3>
            <select
              className="admin-select"
              value={selectedMaterialId}
              onChange={(e) => setSelectedMaterialId(e.target.value)}
            >
              <option value="">Chọn vật tư</option>
              {materials.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.materialCode} · {m.name} ({m.unit})
                </option>
              ))}
            </select>
            <div className="admin-modal-actions">
              <button type="button" className="admin-btn admin-btn--secondary" onClick={() => setLinkTarget(null)}>
                Hủy
              </button>
              <button
                type="button"
                className="admin-btn admin-btn--primary"
                disabled={!selectedMaterialId}
                onClick={() => void linkMaterial(linkTarget)}
              >
                Liên kết
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
