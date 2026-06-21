"use client";

import { useCallback, useEffect, useState } from "react";
import { PURCHASE_REQUEST_STATUS_LABELS } from "@/features/materials/material-labels";
import type { PurchaseRequestStatus } from "@prisma/client";
import { useAdminMutation } from "@/hooks/useAdminAction";
import { parseAdminJsonResponse } from "@/lib/admin/adminMutation";

type Props = { requestId: string };

type RequestDetail = {
  id: string;
  requestCode: string;
  status: PurchaseRequestStatus;
  supplierName: string | null;
  note: string | null;
  expectedArrivalAt: string | null;
  items: Array<{
    id: string;
    materialNameSnapshot: string;
    materialCodeSnapshot: string | null;
    unitSnapshot: string;
    requestedQuantity: string;
    orderedQuantity: string | null;
    receivedQuantity: string;
    linkedOrder: { orderNo: string } | null;
    note: string | null;
  }>;
};

export default function PurchaseRequestDetail({ requestId }: Props) {
  const mutate = useAdminMutation();
  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [receiveQty, setReceiveQty] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const res = await fetch(`/api/purchase-requests/${requestId}`);
    const data = (await res.json()) as { request?: RequestDetail };
    setRequest(data.request ?? null);
  }, [requestId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function changeStatus(status: PurchaseRequestStatus) {
    await mutate({
      loadingMessage: "Đang cập nhật trạng thái…",
      successMessage: "Đã cập nhật trạng thái.",
      action: async () => {
        const res = await fetch(`/api/purchase-requests/${requestId}/status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
        return parseAdminJsonResponse(res, () => true);
      },
      onSuccess: () => void load(),
    });
  }

  async function receiveItem(itemId: string) {
    const quantity = receiveQty[itemId];
    if (!quantity) return;
    await mutate({
      loadingMessage: "Đang ghi nhận hàng về…",
      successMessage: "Đã nhập kho vật tư.",
      action: async () => {
        const res = await fetch(`/api/purchase-requests/${requestId}/receive`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ receives: [{ itemId, quantity }] }),
        });
        return parseAdminJsonResponse(res, () => true);
      },
      onSuccess: () => void load(),
    });
  }

  if (!request) return <p className="admin-field-hint">Đang tải…</p>;

  return (
    <div>
      <div className="admin-detail-header" style={{ marginBottom: 16 }}>
        <h2>{request.requestCode}</h2>
        <p>{PURCHASE_REQUEST_STATUS_LABELS[request.status]}</p>
        {request.supplierName ? <p>NCC: {request.supplierName}</p> : null}
        {request.note ? <p>{request.note}</p> : null}
      </div>

      <div className="admin-ops-row-actions" style={{ marginBottom: 16 }}>
        {request.status === "DRAFT" && (
          <>
            <button type="button" className="admin-btn admin-btn--primary admin-btn--small" onClick={() => void changeStatus("REQUESTED")}>
              Gửi yêu cầu
            </button>
            <button type="button" className="admin-btn admin-btn--secondary admin-btn--small" onClick={() => void changeStatus("CANCELLED")}>
              Hủy yêu cầu
            </button>
          </>
        )}
        {request.status === "REQUESTED" && (
          <button type="button" className="admin-btn admin-btn--primary admin-btn--small" onClick={() => void changeStatus("ORDERED")}>
            Đã đặt hàng
          </button>
        )}
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Vật tư</th>
              <th>Mã</th>
              <th>ĐVT</th>
              <th>Yêu cầu</th>
              <th>Đặt</th>
              <th>Đã nhận</th>
              <th>Đơn hàng</th>
              <th>Nhận thêm</th>
            </tr>
          </thead>
          <tbody>
            {request.items.map((item) => (
              <tr key={item.id}>
                <td>{item.materialNameSnapshot}</td>
                <td>{item.materialCodeSnapshot ?? "—"}</td>
                <td>{item.unitSnapshot}</td>
                <td>{item.requestedQuantity}</td>
                <td>{item.orderedQuantity ?? "—"}</td>
                <td>{item.receivedQuantity}</td>
                <td>{item.linkedOrder?.orderNo ?? "—"}</td>
                <td>
                  {["ORDERED", "PARTIALLY_RECEIVED"].includes(request.status) ? (
                    <div style={{ display: "flex", gap: 4 }}>
                      <input
                        className="admin-input admin-input--xs"
                        type="number"
                        step="0.001"
                        value={receiveQty[item.id] ?? ""}
                        onChange={(e) => setReceiveQty((p) => ({ ...p, [item.id]: e.target.value }))}
                      />
                      <button
                        type="button"
                        className="admin-btn admin-btn--secondary admin-btn--xs"
                        onClick={() => void receiveItem(item.id)}
                      >
                        Nhận
                      </button>
                    </div>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
