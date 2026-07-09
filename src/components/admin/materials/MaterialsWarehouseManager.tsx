"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MATERIAL_TYPE_LABELS, WAREHOUSE_STATUS_LABELS, STOCK_ADJUSTMENT_TYPE_LABELS } from "@/features/materials/material-labels";
import type { MaterialStockAdjustmentType } from "@prisma/client";
import { useAdminMutation } from "@/hooks/useAdminAction";
import { parseAdminJsonResponse } from "@/lib/admin/adminMutation";
import AdminInlineLoader from "@/components/admin/feedback/AdminInlineLoader";

type WarehouseRow = {
  materialId: string;
  materialCode: string;
  name: string;
  materialType: string;
  unit: string;
  reorderPoint: string | null;
  onHandQuantity: string | null;
  reservedQuantity: string | null;
  availableQuantity: string | null;
  warehouseStatus: keyof typeof WAREHOUSE_STATUS_LABELS;
};

export default function MaterialsWarehouseManager() {
  const searchParams = useSearchParams();
  const mutate = useAdminMutation();
  const [rows, setRows] = useState<WarehouseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [panelMaterialId, setPanelMaterialId] = useState<string | null>(
    searchParams.get("materialId"),
  );
  const [adjustType, setAdjustType] = useState<MaterialStockAdjustmentType>("RECEIVE");
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");
  const [history, setHistory] = useState<Array<{
    id: string;
    adjustmentType: MaterialStockAdjustmentType;
    quantity: string;
    nextOnHandQuantity: string;
    createdAt: string;
    note: string | null;
  }>>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/materials?view=warehouse");
    const data = (await res.json()) as { rows?: WarehouseRow[] };
    setRows(data.rows ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function openHistory(materialId: string) {
    setPanelMaterialId(materialId);
    const res = await fetch(`/api/materials/${materialId}/warehouse-history`);
    const data = (await res.json()) as { history?: typeof history };
    setHistory(data.history ?? []);
  }

  async function submitAdjustment() {
    if (!panelMaterialId) return;
    const messages: Record<MaterialStockAdjustmentType, string> = {
      OPENING_BALANCE: "Đã cập nhật tồn kho.",
      RECEIVE: "Đã nhập kho vật tư.",
      CORRECTION: "Đã điều chỉnh tồn kho.",
      ISSUE_TO_PRODUCTION: "Đã cấp vật tư cho sản xuất.",
      RETURN_FROM_PRODUCTION: "Đã cập nhật tồn kho.",
    };
    await mutate({
      loadingMessage: "Đang cập nhật tồn kho…",
      successMessage: messages[adjustType],
      action: async () => {
        const res = await fetch(`/api/materials/${panelMaterialId}/stock-adjustments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ adjustmentType: adjustType, quantity, note }),
        });
        return parseAdminJsonResponse(res, () => true);
      },
      onSuccess: async () => {
        setQuantity("");
        setNote("");
        setPanelMaterialId(null);
        await load();
      },
    });
  }

  const panelRow = rows.find((r) => r.materialId === panelMaterialId);

  return (
    <div>
      {loading ? (
        <AdminInlineLoader message="Đang tải tồn kho vật tư…" />
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Mã</th>
                <th>Vật tư</th>
                <th>Loại</th>
                <th>ĐVT</th>
                <th>Tồn thực tế</th>
                <th>Đã giữ</th>
                <th>Khả dụng</th>
                <th>Mức tồn tối thiểu</th>
                <th>Trạng thái</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.materialId}>
                  <td>{row.materialCode}</td>
                  <td>{row.name}</td>
                  <td>{MATERIAL_TYPE_LABELS[row.materialType as keyof typeof MATERIAL_TYPE_LABELS] ?? row.materialType}</td>
                  <td>{row.unit}</td>
                  <td>{row.onHandQuantity ?? "—"}</td>
                  <td>{row.reservedQuantity ?? "—"}</td>
                  <td>{row.availableQuantity ?? "—"}</td>
                  <td>{row.reorderPoint ?? "—"}</td>
                  <td>{WAREHOUSE_STATUS_LABELS[row.warehouseStatus]}</td>
                  <td>
                    <button
                      type="button"
                      className="admin-btn admin-btn--secondary admin-btn--xs"
                      onClick={() => void openHistory(row.materialId)}
                    >
                      Thao tác
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {panelMaterialId && panelRow ? (
        <div className="admin-modal-backdrop" role="presentation">
          <div className="admin-modal admin-modal--wide">
            <h3>{panelRow.materialCode} · {panelRow.name}</h3>
            <div className="admin-field">
              <label className="admin-label">Loại thao tác</label>
              <select
                className="admin-select"
                value={adjustType}
                onChange={(e) => setAdjustType(e.target.value as MaterialStockAdjustmentType)}
              >
                {Object.entries(STOCK_ADJUSTMENT_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="admin-field">
              <label className="admin-label">Số lượng</label>
              <input className="admin-input" type="number" step="0.001" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </div>
            <div className="admin-field">
              <label className="admin-label">Ghi chú</label>
              <textarea className="admin-textarea" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            <div className="admin-modal-actions">
              <button type="button" className="admin-btn admin-btn--secondary" onClick={() => setPanelMaterialId(null)}>
                Đóng
              </button>
              <button type="button" className="admin-btn admin-btn--primary" onClick={() => void submitAdjustment()}>
                Xác nhận
              </button>
            </div>
            <h4>Lịch sử</h4>
            <ul className="admin-list-compact">
              {history.map((h) => (
                <li key={h.id}>
                  {STOCK_ADJUSTMENT_TYPE_LABELS[h.adjustmentType]} · {h.quantity} → tồn {h.nextOnHandQuantity}
                  {h.note ? ` · ${h.note}` : ""}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}
