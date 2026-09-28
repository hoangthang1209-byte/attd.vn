"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  MATERIAL_TYPE_LABELS,
  WAREHOUSE_STATUS_LABELS,
  STOCK_ADJUSTMENT_TYPE_LABELS,
} from "@/features/materials/material-labels";
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
  issuedQuantity: string | null;
  warehouseStatus: keyof typeof WAREHOUSE_STATUS_LABELS;
};

type WarehouseHistoryRow = {
  id: string;
  adjustmentType: MaterialStockAdjustmentType;
  quantity: string;
  previousOnHandQuantity: string;
  nextOnHandQuantity: string;
  createdAt: string;
  note: string | null;
  referenceOrder: { id: string; orderNo: string } | null;
  createdByEmployee: { id: string; fullName: string } | null;
};

function formatStockDelta(row: WarehouseHistoryRow): string {
  const previous = Number(row.previousOnHandQuantity);
  const next = Number(row.nextOnHandQuantity);
  const delta = next - previous;
  if (!Number.isFinite(delta)) return row.quantity;
  return `${delta > 0 ? "+" : ""}${delta}`;
}

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
  const [history, setHistory] = useState<WarehouseHistoryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/materials?view=warehouse");
    const data = (await res.json()) as { rows?: WarehouseRow[] };
    setRows(data.rows ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/materials?view=warehouse")
      .then(async (res) => {
        const data = (await res.json()) as { rows?: WarehouseRow[] };
        if (!res.ok) throw new Error("Không thể tải tồn kho vật tư.");
        return data;
      })
      .then((data) => {
        if (cancelled) return;
        setRows(data.rows ?? []);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setRows([]);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function openHistory(materialId: string) {
    setPanelMaterialId(materialId);
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/materials/${materialId}/warehouse-history`);
      const data = (await res.json()) as { history?: WarehouseHistoryRow[] };
      setHistory(data.history ?? []);
    } finally {
      setHistoryLoading(false);
    }
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
        await load();
        await openHistory(panelMaterialId);
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
                <th>Đã cấp SX</th>
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
                  <td>
                    {MATERIAL_TYPE_LABELS[row.materialType as keyof typeof MATERIAL_TYPE_LABELS] ??
                      row.materialType}
                  </td>
                  <td>{row.unit}</td>
                  <td>{row.onHandQuantity ?? "—"}</td>
                  <td>{row.reservedQuantity ?? "—"}</td>
                  <td>{row.issuedQuantity ?? "—"}</td>
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
            <h3>
              {panelRow.materialCode} · {panelRow.name}
            </h3>
            <p className="admin-field-hint" style={{ marginTop: 0 }}>
              Tồn {panelRow.onHandQuantity ?? "—"} {panelRow.unit} · Đã giữ{" "}
              {panelRow.reservedQuantity ?? "—"} · Đã cấp SX {panelRow.issuedQuantity ?? "—"} ·
              Khả dụng {panelRow.availableQuantity ?? "—"}
            </p>

            <div className="admin-field">
              <label className="admin-label">Loại thao tác</label>
              <select
                className="admin-select"
                value={adjustType}
                onChange={(e) => setAdjustType(e.target.value as MaterialStockAdjustmentType)}
              >
                {Object.entries(STOCK_ADJUSTMENT_TYPE_LABELS).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
            <div className="admin-field">
              <label className="admin-label">Số lượng</label>
              <input
                className="admin-input"
                type="number"
                step="0.001"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
              {adjustType === "RETURN_FROM_PRODUCTION" ? (
                <p className="admin-field-hint">
                  Tối đa có thể trả: {panelRow.issuedQuantity ?? "0"} {panelRow.unit}.
                </p>
              ) : null}
            </div>
            <div className="admin-field">
              <label className="admin-label">Ghi chú</label>
              <textarea
                className="admin-textarea"
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
            <div className="admin-modal-actions">
              <button
                type="button"
                className="admin-btn admin-btn--secondary"
                onClick={() => setPanelMaterialId(null)}
              >
                Đóng
              </button>
              <button
                type="button"
                className="admin-btn admin-btn--primary"
                onClick={() => void submitAdjustment()}
              >
                Xác nhận
              </button>
            </div>

            <h4>Lịch sử kho</h4>
            {historyLoading ? (
              <AdminInlineLoader message="Đang tải lịch sử kho…" />
            ) : history.length === 0 ? (
              <p className="admin-field-hint">Chưa có giao dịch kho.</p>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Thời gian</th>
                      <th>Thao tác</th>
                      <th>Thay đổi</th>
                      <th>Tồn trước</th>
                      <th>Tồn sau</th>
                      <th>Tham chiếu</th>
                      <th>Người thao tác</th>
                      <th>Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((row) => (
                      <tr key={row.id}>
                        <td>{new Date(row.createdAt).toLocaleString("vi-VN")}</td>
                        <td>{STOCK_ADJUSTMENT_TYPE_LABELS[row.adjustmentType]}</td>
                        <td>{formatStockDelta(row)}</td>
                        <td>{row.previousOnHandQuantity}</td>
                        <td>{row.nextOnHandQuantity}</td>
                        <td>{row.referenceOrder?.orderNo ?? "—"}</td>
                        <td>{row.createdByEmployee?.fullName ?? "—"}</td>
                        <td>{row.note ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
