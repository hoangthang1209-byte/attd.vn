"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import AdminBackLink from "@/components/admin/AdminBackLink";
import MaterialSupplierSelect from "@/components/admin/materials/MaterialSupplierSelect";
import type { MaterialSupplierLinkRecord } from "@/features/materials/material-supplier-link.service";
import { PURCHASE_REQUEST_STATUS_LABELS } from "@/features/materials/material-labels";
import type { PurchaseRequestStatus } from "@prisma/client";
import { buildListBackHref } from "@/lib/admin/list-return";
import { useAdminMutation } from "@/hooks/useAdminAction";
import { parseAdminJsonResponse } from "@/lib/admin/adminMutation";

type Props = { requestId: string };

type RequestDetail = {
  id: string;
  requestCode: string;
  status: PurchaseRequestStatus;
  supplierId: string | null;
  supplierName: string | null;
  supplierNameSnapshot: string | null;
  note: string | null;
  expectedArrivalAt: string | null;
  supplier: {
    id: string;
    supplierCode: string;
    name: string;
    contactName: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
  } | null;
  items: Array<{
    id: string;
    materialId: string | null;
    materialNameSnapshot: string;
    materialCodeSnapshot: string | null;
    unitSnapshot: string;
    requestedQuantity: string;
    orderedQuantity: string | null;
    receivedQuantity: string;
    linkedOrder: { orderNo: string } | null;
    note: string | null;
    preferredSupplier: MaterialSupplierLinkRecord | null;
  }>;
};

export default function PurchaseRequestDetail({ requestId }: Props) {
  const searchParams = useSearchParams();
  const mutate = useAdminMutation();
  const listBackHref = buildListBackHref("/admin/purchase-requests", searchParams);
  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [receiveQty, setReceiveQty] = useState<Record<string, string>>({});
  const [editSupplierId, setEditSupplierId] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/purchase-requests/${requestId}`);
    const data = (await res.json()) as { request?: RequestDetail };
    const req = data.request ?? null;
    setRequest(req);
    if (req) setEditSupplierId(req.supplierId ?? "");
  }, [requestId]);

  useEffect(() => {
    void load();
  }, [load]);

  const displaySupplierName =
    request?.supplierNameSnapshot ?? request?.supplierName ?? request?.supplier?.name ?? null;

  const hasPreferredMismatch = useMemo(() => {
    if (!request?.supplierId) return false;
    return request.items.some(
      (item) =>
        item.preferredSupplier &&
        item.preferredSupplier.supplierId !== request.supplierId,
    );
  }, [request]);

  const showCommonSupplierUndetermined = useMemo(() => {
    if (!request || request.supplierId) return false;
    const withPreferred = request.items.filter((i) => i.preferredSupplier);
    if (withPreferred.length === 0) return false;
    const supplierIds = new Set(withPreferred.map((i) => i.preferredSupplier!.supplierId));
    return supplierIds.size !== 1 || withPreferred.length < request.items.filter((i) => i.materialId).length;
  }, [request]);

  async function saveSupplier() {
    if (!request) return;
    await mutate({
      loadingMessage: "Đang lưu nhà cung cấp…",
      successMessage: "Đã cập nhật nhà cung cấp.",
      action: async () => {
        const res = await fetch(`/api/purchase-requests/${requestId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ supplierId: editSupplierId || null }),
        });
        return parseAdminJsonResponse(res, () => true);
      },
      onSuccess: () => void load(),
    });
  }

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

  const canEditSupplier = ["DRAFT", "REQUESTED"].includes(request.status);
  const contact = request.supplier;

  return (
    <div>
      <AdminBackLink href={listBackHref} label="Quay lại danh sách yêu cầu mua hàng" />

      <div className="admin-detail-header" style={{ marginTop: 12, marginBottom: 16 }}>
        <h2>{request.requestCode}</h2>
        <p>{PURCHASE_REQUEST_STATUS_LABELS[request.status]}</p>
        {displaySupplierName ? <p>NCC: {displaySupplierName}</p> : null}
        {request.supplierNameSnapshot && request.supplier?.name && request.supplier.name !== request.supplierNameSnapshot ? (
          <p className="admin-field-hint">Tên lưu tại thời điểm tạo: {request.supplierNameSnapshot}</p>
        ) : null}
        {request.note ? <p>{request.note}</p> : null}
      </div>

      {showCommonSupplierUndetermined && (
        <p className="admin-field-hint" style={{ marginBottom: 12 }}>
          Chưa xác định nhà cung cấp chung.
        </p>
      )}

      {hasPreferredMismatch && (
        <p className="admin-field-hint admin-error" style={{ marginBottom: 12 }}>
          Một số vật tư có nhà cung cấp ưu tiên khác.
        </p>
      )}

      {canEditSupplier ? (
        <div className="admin-panel" style={{ marginBottom: 16 }}>
          <MaterialSupplierSelect
            value={editSupplierId}
            onChange={(id) => setEditSupplierId(id)}
          />
          <button
            type="button"
            className="admin-btn admin-btn--secondary admin-btn--small"
            style={{ marginTop: 8 }}
            onClick={() => void saveSupplier()}
          >
            Lưu nhà cung cấp
          </button>
        </div>
      ) : contact ? (
        <div className="admin-field-hint" style={{ marginBottom: 16 }}>
          {contact.contactName && <p>Liên hệ: {contact.contactName}</p>}
          {contact.phone && <p>SĐT: {contact.phone}</p>}
          {contact.email && <p>Email: {contact.email}</p>}
          {contact.address && <p>Địa chỉ: {contact.address}</p>}
        </div>
      ) : displaySupplierName ? (
        <p className="admin-field-hint" style={{ marginBottom: 16 }}>
          NCC (lưu): {displaySupplierName}
        </p>
      ) : null}

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
              <th>NCC ưu tiên</th>
              <th>Nhận thêm</th>
            </tr>
          </thead>
          <tbody>
            {request.items.map((item) => {
              const pref = item.preferredSupplier;
              const prefDiffers =
                pref && request.supplierId && pref.supplierId !== request.supplierId;
              return (
                <tr key={item.id}>
                  <td>{item.materialNameSnapshot}</td>
                  <td>{item.materialCodeSnapshot ?? "—"}</td>
                  <td>{item.unitSnapshot}</td>
                  <td>{item.requestedQuantity}</td>
                  <td>{item.orderedQuantity ?? "—"}</td>
                  <td>{item.receivedQuantity}</td>
                  <td>{item.linkedOrder?.orderNo ?? "—"}</td>
                  <td>
                    {pref ? (
                      <span className={prefDiffers ? "admin-field-hint" : undefined}>
                        {pref.supplierName}
                        {prefDiffers ? " (khác NCC YC)" : ""}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
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
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
