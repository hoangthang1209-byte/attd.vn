"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { DeliveryProofType } from "@prisma/client";
import type { OrderDetailRecord } from "@/features/orders/order.types";
import type {
  DeliveryExecutionRecord,
  DeliveryProofRecord,
} from "@/features/orders/delivery-execution.service";
import type {
  CompletionReadinessResult,
  DeliveryFulfillmentSummary,
} from "@/features/orders/delivery-fulfillment.service";
import AdminInlineLoader from "@/components/admin/feedback/AdminInlineLoader";
import {
  DELIVERY_ATTEMPT_RESULT_LABELS,
  DELIVERY_PROOF_TYPE_LABELS,
} from "@/features/orders/delivery-execution-labels";
import { formatOrderDateTime } from "@/features/orders/order-format";
import { formatQuantityDisplay } from "@/features/orders/production-quantity-display";
import { useAdminMutation } from "@/hooks/useAdminAction";
import { parseAdminJsonResponse } from "@/lib/admin/adminMutation";

type Tab = "executions" | "results" | "proofs" | "completion";

type Props = {
  orderId: string;
  order: OrderDetailRecord;
  onRequestShip?: () => void;
  refreshKey?: number;
};

type MediaPick = {
  id: string;
  filename: string;
  url: string;
  thumbnailUrl: string | null;
  mimeType: string;
};

function qtyDisplay(value: string | number): string {
  const n = typeof value === "number" ? value : Number(value);
  return formatQuantityDisplay(Number.isFinite(n) ? n : 0);
}

function isImageMime(mime: string): boolean {
  return mime.startsWith("image/");
}

export default function OrderDeliveryExecutionSection({
  orderId,
  order,
  onRequestShip,
  refreshKey = 0,
}: Props) {
  const mutate = useAdminMutation();
  const [tab, setTab] = useState<Tab>("executions");
  const [loading, setLoading] = useState(true);
  const [executions, setExecutions] = useState<DeliveryExecutionRecord[]>([]);
  const [fulfillment, setFulfillment] = useState<DeliveryFulfillmentSummary | null>(null);
  const [readiness, setReadiness] = useState<CompletionReadinessResult | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createItems, setCreateItems] = useState<
    Array<{ key: string; label: string; planned: string; dispatched: string }>
  >([]);
  const [proofType, setProofType] = useState<DeliveryProofType>("DELIVERY_PHOTO");
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [mediaAssets, setMediaAssets] = useState<MediaPick[]>([]);
  const [attemptForm, setAttemptForm] = useState({
    result: "DELIVERED" as keyof typeof DELIVERY_ATTEMPT_RESULT_LABELS,
    note: "",
    failureReason: "",
    nextAttemptAt: "",
  });
  const [itemQty, setItemQty] = useState<Record<string, { delivered: string; returned: string; damaged: string }>>({});

  const selected = executions.find((e) => e.id === selectedId) ?? executions[0] ?? null;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [execRes, fulfillRes, readyRes] = await Promise.all([
        fetch(`/api/orders/${orderId}/delivery-executions`),
        fetch(`/api/orders/${orderId}/delivery-fulfillment`),
        fetch(`/api/orders/${orderId}/completion-readiness`),
      ]);
      const execData = await execRes.json();
      const fulfillData = await fulfillRes.json();
      const readyData = await readyRes.json();
      const list = Array.isArray(execData.executions) ? execData.executions as DeliveryExecutionRecord[] : [];
      setExecutions(list);
      setFulfillment(fulfillData.fulfillment ?? null);
      setReadiness(readyData.readiness ?? null);
      if (!selectedId && list[0]) setSelectedId(list[0].id);
    } finally {
      setLoading(false);
    }
  }, [orderId, selectedId]);

  useEffect(() => { void load(); }, [load, refreshKey]);

  async function openCreateModal() {
    const res = await fetch(`/api/orders/${orderId}/delivery-fulfillment`);
    const data = await res.json() as { fulfillment?: DeliveryFulfillmentSummary };
    const lines = data.fulfillment?.lines ?? [];
    setCreateItems(
      lines
        .filter((l) => Number(l.remainingDispatchableQuantity) > 0)
        .map((l) => ({
          key: `${l.orderItemId}:${l.orderItemVariantId ?? ""}`,
          label: [l.productName, l.colorName, l.sizeValue].filter(Boolean).join(" · "),
          planned: l.remainingDispatchableQuantity,
          dispatched: l.remainingDispatchableQuantity,
        })),
    );
    setCreateOpen(true);
  }

  async function submitCreate(saveAsDraft: boolean) {
    await mutate({
      loadingMessage: "Đang tạo chuyến giao hàng…",
      successMessage: "Đã tạo chuyến giao hàng.",
      action: async () => {
        const fulfillmentRes = await fetch(`/api/orders/${orderId}/delivery-fulfillment`);
        const fulfillmentData = await fulfillmentRes.json() as { fulfillment?: DeliveryFulfillmentSummary };
        const lineMap = new Map(
          (fulfillmentData.fulfillment?.lines ?? []).map((l) => [
            `${l.orderItemId}:${l.orderItemVariantId ?? ""}`,
            l,
          ]),
        );
        const items = createItems
          .filter((row) => Number(row.dispatched) > 0)
          .map((row, index) => {
            const line = lineMap.get(row.key);
            return {
              orderItemId: line?.orderItemId,
              orderItemVariantId: line?.orderItemVariantId,
              productNameSnapshot: line?.productName ?? row.label,
              colorNameSnapshot: line?.colorName,
              sizeValueSnapshot: line?.sizeValue,
              skuSnapshot: line?.sku,
              unitSnapshot: line?.unit,
              plannedQuantity: row.planned,
              dispatchedQuantity: row.dispatched,
              sortOrder: index,
            };
          });
        const res = await fetch(`/api/orders/${orderId}/delivery-executions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            deliveryMethodId: order.deliveryMethodId,
            deliveryCarrierId: order.deliveryCarrierId,
            trackingCode: order.deliveryTrackingCode,
            assignedEmployeeId: order.deliveryOwnerId,
            recipientNameSnapshot: order.deliveryRecipientName,
            recipientPhoneSnapshot: order.deliveryRecipientPhone,
            recipientAddressSnapshot: order.deliveryAddress,
            expectedDeliveryAt: order.deliveryExpectedAt,
            note: order.deliveryNote,
            status: saveAsDraft ? "DRAFT" : "READY_TO_DISPATCH",
            items,
          }),
        });
        const createdResult = await parseAdminJsonResponse(res, (b) => b.execution as DeliveryExecutionRecord);
        if (!createdResult.ok) return createdResult;
        if (!saveAsDraft) {
          const dispatchRes = await fetch(
            `/api/orders/${orderId}/delivery-executions/${createdResult.data.id}/dispatch`,
            { method: "POST" },
          );
          return parseAdminJsonResponse(dispatchRes, (b) => b.execution as DeliveryExecutionRecord);
        }
        return createdResult;
      },
      onSuccess: () => {
        setCreateOpen(false);
        void load();
        onRequestShip?.();
      },
    });
  }

  async function dispatchExecution(executionId: string) {
    await mutate({
      loadingMessage: "Đang xác nhận xuất hàng…",
      successMessage: "Đã xác nhận xuất hàng.",
      action: async () => {
        const res = await fetch(
          `/api/orders/${orderId}/delivery-executions/${executionId}/dispatch`,
          { method: "POST" },
        );
        return parseAdminJsonResponse(res, (b) => b.execution as DeliveryExecutionRecord);
      },
      onSuccess: () => void load(),
    });
  }

  async function setExecutionStatus(executionId: string, status: string) {
    await mutate({
      loadingMessage: "Đang cập nhật trạng thái…",
      successMessage: "Đã cập nhật trạng thái chuyến.",
      action: async () => {
        const res = await fetch(
          `/api/orders/${orderId}/delivery-executions/${executionId}/status`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
          },
        );
        return parseAdminJsonResponse(res, (b) => b.execution as DeliveryExecutionRecord);
      },
      onSuccess: () => void load(),
    });
  }

  async function submitAttempt() {
    if (!selected) return;
    const itemQuantities = selected.items.map((item) => ({
      itemId: item.id,
      deliveredQuantity: itemQty[item.id]?.delivered ?? item.deliveredQuantity,
      returnedQuantity: itemQty[item.id]?.returned ?? "0",
      damagedQuantity: itemQty[item.id]?.damaged ?? "0",
    }));
    await mutate({
      loadingMessage: "Đang ghi nhận kết quả giao…",
      successMessage: "Đã ghi nhận kết quả giao hàng.",
      action: async () => {
        const res = await fetch(
          `/api/orders/${orderId}/delivery-executions/${selected.id}/attempts`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              result: attemptForm.result,
              note: attemptForm.note || null,
              failureReason: attemptForm.failureReason || null,
              nextAttemptAt: attemptForm.nextAttemptAt || null,
              itemQuantities,
            }),
          },
        );
        return parseAdminJsonResponse(res, (b) => b.execution as DeliveryExecutionRecord);
      },
      onSuccess: () => {
        setAttemptForm({ result: "DELIVERED", note: "", failureReason: "", nextAttemptAt: "" });
        void load();
      },
    });
  }

  async function openMediaPicker() {
    const res = await fetch("/api/media?folder=orders&limit=60");
    const data = await res.json() as { assets?: MediaPick[] };
    setMediaAssets(data.assets ?? []);
    setMediaPickerOpen(true);
  }

  async function addProof(mediaAssetId: string) {
    if (!selected) return;
    await mutate({
      loadingMessage: "Đang thêm bằng chứng…",
      successMessage: "Đã thêm bằng chứng giao hàng.",
      action: async () => {
        const res = await fetch(
          `/api/orders/${orderId}/delivery-executions/${selected.id}/proofs`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mediaAssetId, proofType }),
          },
        );
        return parseAdminJsonResponse(res, (b) => b.proof as DeliveryProofRecord);
      },
      onSuccess: () => {
        setMediaPickerOpen(false);
        void load();
      },
    });
  }

  async function removeProof(proofId: string) {
    if (!selected) return;
    await mutate({
      loadingMessage: "Đang xóa bằng chứng…",
      successMessage: "Đã xóa bằng chứng.",
      action: async () => {
        const res = await fetch(
          `/api/orders/${orderId}/delivery-executions/${selected.id}/proofs/${proofId}`,
          { method: "DELETE" },
        );
        if (!res.ok) {
          const body = await res.json().catch(() => ({})) as { message?: string };
          return { ok: false as const, message: body.message ?? "Không thể xóa" };
        }
        return { ok: true as const, data: null };
      },
      onSuccess: () => void load(),
    });
  }

  const progressLabel = fulfillment
    ? `Đã giao ${qtyDisplay(fulfillment.totalDeliveredQuantity)} / ${qtyDisplay(fulfillment.qcPassedQuantity ?? fulfillment.orderedQuantity)} sản phẩm`
    : "";

  return (
    <fieldset className="admin-catalog-fieldset" style={{ marginTop: 16 }}>
      <legend>THỰC HIỆN GIAO HÀNG</legend>

      <div className="admin-tab-row" style={{ marginBottom: 12 }}>
        {([
          ["executions", "Chuyến giao hàng"],
          ["results", "Kết quả giao hàng"],
          ["proofs", "Bằng chứng giao hàng"],
          ["completion", "Hoàn tất đơn hàng"],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={`admin-tab${tab === key ? " admin-tab--active" : ""}`}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <AdminInlineLoader message="Đang tải tiến độ giao hàng…" />
      ) : (
        <>
          {tab === "executions" && (
            <>
              <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                <button type="button" className="admin-btn admin-btn--primary admin-btn--small" onClick={() => void openCreateModal()}>
                  Tạo chuyến giao hàng
                </button>
                {progressLabel && <span className="admin-field-hint">{progressLabel}</span>}
              </div>
              <div className="admin-table-wrap">
                <table className="admin-table admin-table--compact">
                  <thead>
                    <tr>
                      <th>Mã chuyến</th>
                      <th>Trạng thái</th>
                      <th>ĐVVC</th>
                      <th>Mã vận đơn</th>
                      <th>Người giao</th>
                      <th>Ngày xuất</th>
                      <th>Xuất</th>
                      <th>Giao OK</th>
                      <th>Hoàn</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {executions.length === 0 ? (
                      <tr><td colSpan={10} className="admin-field-hint">Chưa có chuyến giao hàng.</td></tr>
                    ) : executions.map((ex) => (
                      <tr key={ex.id}>
                        <td>{ex.executionCode}</td>
                        <td>{ex.statusLabel}</td>
                        <td>{ex.carrierNameSnapshot ?? "—"}</td>
                        <td>{ex.trackingCode ?? "—"}</td>
                        <td>{ex.assignedEmployeeName ?? "—"}</td>
                        <td>{ex.dispatchedAt ? formatOrderDateTime(ex.dispatchedAt) : "—"}</td>
                        <td>{qtyDisplay(ex.totalDispatchedQuantity)}</td>
                        <td>{qtyDisplay(ex.totalDeliveredQuantity)}</td>
                        <td>{qtyDisplay(ex.totalReturnedQuantity)}</td>
                        <td>
                          <button type="button" className="admin-btn admin-btn--ghost admin-btn--small" onClick={() => { setSelectedId(ex.id); setTab("results"); }}>Chi tiết</button>
                          {ex.status === "DRAFT" || ex.status === "READY_TO_DISPATCH" ? (
                            <button type="button" className="admin-btn admin-btn--secondary admin-btn--small" onClick={() => void dispatchExecution(ex.id)}>Xuất hàng</button>
                          ) : null}
                          {ex.status === "DISPATCHED" ? (
                            <button type="button" className="admin-btn admin-btn--secondary admin-btn--small" onClick={() => void setExecutionStatus(ex.id, "IN_TRANSIT")}>Đang giao</button>
                          ) : null}
                          {ex.status === "DRAFT" || ex.status === "READY_TO_DISPATCH" ? (
                            <button type="button" className="admin-btn admin-btn--ghost admin-btn--small" onClick={() => void setExecutionStatus(ex.id, "CANCELLED")}>Hủy</button>
                          ) : null}
                          <Link className="admin-btn admin-btn--ghost admin-btn--small" href={`/admin/orders/${orderId}/delivery-note?executionId=${ex.id}`}>Phiếu giao</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {tab === "results" && selected && (
            <>
              <p className="admin-field-hint">Chuyến: <strong>{selected.executionCode}</strong> · {progressLabel}</p>
              <div className="admin-catalog-variant-fields" style={{ marginBottom: 12 }}>
                <div className="admin-field">
                  <label className="admin-label">Kết quả</label>
                  <select className="admin-input" value={attemptForm.result} onChange={(e) => setAttemptForm((f) => ({ ...f, result: e.target.value as typeof attemptForm.result }))}>
                    {Object.entries(DELIVERY_ATTEMPT_RESULT_LABELS).map(([k, label]) => (
                      <option key={k} value={k}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className="admin-field">
                  <label className="admin-label">Ghi chú / lý do</label>
                  <input className="admin-input" value={attemptForm.note} onChange={(e) => setAttemptForm((f) => ({ ...f, note: e.target.value }))} />
                </div>
                <div className="admin-field">
                  <label className="admin-label">Hẹn giao lại</label>
                  <input className="admin-input" type="datetime-local" value={attemptForm.nextAttemptAt} onChange={(e) => setAttemptForm((f) => ({ ...f, nextAttemptAt: e.target.value }))} />
                </div>
              </div>
              <div className="admin-table-wrap">
                <table className="admin-table admin-table--compact">
                  <thead>
                    <tr>
                      <th>Sản phẩm</th>
                      <th>Xuất</th>
                      <th>Giao OK</th>
                      <th>Hoàn</th>
                      <th>Hư</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.items.map((item) => (
                      <tr key={item.id}>
                        <td>{[item.productNameSnapshot, item.colorNameSnapshot, item.sizeValueSnapshot].filter(Boolean).join(" · ")}</td>
                        <td>{qtyDisplay(item.dispatchedQuantity)}</td>
                        <td>
                          <input
                            className="admin-input admin-input--compact"
                            value={itemQty[item.id]?.delivered ?? item.deliveredQuantity}
                            onChange={(e) => setItemQty((m) => ({ ...m, [item.id]: { delivered: e.target.value, returned: m[item.id]?.returned ?? "0", damaged: m[item.id]?.damaged ?? "0" } }))}
                          />
                        </td>
                        <td>
                          <input
                            className="admin-input admin-input--compact"
                            value={itemQty[item.id]?.returned ?? item.returnedQuantity}
                            onChange={(e) => setItemQty((m) => ({ ...m, [item.id]: { delivered: m[item.id]?.delivered ?? item.deliveredQuantity, returned: e.target.value, damaged: m[item.id]?.damaged ?? "0" } }))}
                          />
                        </td>
                        <td>
                          <input
                            className="admin-input admin-input--compact"
                            value={itemQty[item.id]?.damaged ?? item.damagedQuantity}
                            onChange={(e) => setItemQty((m) => ({ ...m, [item.id]: { delivered: m[item.id]?.delivered ?? item.deliveredQuantity, returned: m[item.id]?.returned ?? "0", damaged: e.target.value } }))}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button type="button" className="admin-btn admin-btn--primary admin-btn--small" onClick={() => void submitAttempt()}>
                Ghi nhận lần giao
              </button>
              <div style={{ marginTop: 16 }}>
                <h4 className="admin-field-hint">Lịch sử lần giao</h4>
                {selected.attempts.length === 0 ? (
                  <p className="admin-field-hint">Chưa có lần giao nào.</p>
                ) : selected.attempts.map((a) => (
                  <p key={a.id} className="admin-field-hint">
                    Lần {a.attemptNumber}: {a.resultLabel}
                    {a.attemptedAt ? ` · ${formatOrderDateTime(a.attemptedAt)}` : ""}
                    {a.note ? ` · ${a.note}` : ""}
                  </p>
                ))}
              </div>
            </>
          )}

          {tab === "proofs" && selected && (
            <>
              <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                <select className="admin-input" value={proofType} onChange={(e) => setProofType(e.target.value as DeliveryProofType)}>
                  {Object.entries(DELIVERY_PROOF_TYPE_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>{label}</option>
                  ))}
                </select>
                <button type="button" className="admin-btn admin-btn--secondary admin-btn--small" onClick={() => void openMediaPicker()}>
                  Thêm từ thư viện
                </button>
              </div>
              <div className="admin-media-grid">
                {selected.proofs.map((proof) => (
                  <div key={proof.id} className="admin-media-card">
                    {isImageMime(proof.mimeType) && proof.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={proof.thumbnailUrl} alt={proof.title ?? proof.filename} />
                    ) : (
                      <div className="admin-media-card__file">{proof.filename}</div>
                    )}
                    <p className="admin-field-hint">{proof.proofTypeLabel}</p>
                    <p className="admin-field-hint">{formatOrderDateTime(proof.createdAt)}</p>
                    <a className="admin-btn admin-btn--ghost admin-btn--small" href={proof.url} target="_blank" rel="noreferrer">Mở</a>
                    <button type="button" className="admin-btn admin-btn--ghost admin-btn--small" onClick={() => void removeProof(proof.id)}>Xóa</button>
                  </div>
                ))}
              </div>
            </>
          )}

          {tab === "completion" && (
            <>
              {readiness && (
                <>
                  <p><strong>{readiness.stateLabel}</strong></p>
                  <ul className="admin-field-hint">
                    <li>Tổng đơn: {qtyDisplay(readiness.summary.orderedQuantity)}</li>
                    <li>Đã xuất: {qtyDisplay(readiness.summary.totalDispatchedQuantity)}</li>
                    <li>Đã giao thành công: {qtyDisplay(readiness.summary.totalDeliveredQuantity)}</li>
                    <li>Chưa giao: {qtyDisplay(readiness.summary.remainingUndeliveredQuantity)}</li>
                    <li>Hoàn hàng: {qtyDisplay(readiness.summary.totalReturnedQuantity)}</li>
                    <li>Hư hỏng: {qtyDisplay(readiness.summary.totalDamagedQuantity)}</li>
                    <li>Số chuyến: {readiness.executionCount}</li>
                  </ul>
                  {readiness.missingConditions.length > 0 && (
                    <ul>
                      {readiness.missingConditions.map((c) => <li key={c}>{c}</li>)}
                    </ul>
                  )}
                </>
              )}
            </>
          )}
        </>
      )}

      {createOpen && (
        <div className="quote-quick-contact-modal">
          <div className="quote-quick-contact-modal__backdrop" onClick={() => setCreateOpen(false)} />
          <div className="quote-quick-contact-modal__panel" style={{ maxWidth: 720 }}>
            <h3>Tạo chuyến giao hàng</h3>
            <p className="admin-field-hint">Người nhận: {order.deliveryRecipientName ?? "—"} · {order.deliveryAddress ?? "—"}</p>
            {createItems.length === 0 ? (
              <p className="admin-field-hint">Không còn số lượng có thể xuất.</p>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table admin-table--compact">
                  <thead><tr><th>Sản phẩm</th><th>Kế hoạch</th><th>Xuất</th></tr></thead>
                  <tbody>
                    {createItems.map((row) => (
                      <tr key={row.key}>
                        <td>{row.label}</td>
                        <td>{row.planned}</td>
                        <td>
                          <input
                            className="admin-input admin-input--compact"
                            value={row.dispatched}
                            onChange={(e) => setCreateItems((items) => items.map((it) => it.key === row.key ? { ...it, dispatched: e.target.value, planned: e.target.value } : it))}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button type="button" className="admin-btn admin-btn--secondary" onClick={() => setCreateOpen(false)}>Hủy</button>
              <button type="button" className="admin-btn admin-btn--secondary" onClick={() => void submitCreate(true)}>Lưu nháp</button>
              <button type="button" className="admin-btn admin-btn--primary" onClick={() => void submitCreate(false)}>Xác nhận xuất hàng</button>
            </div>
          </div>
        </div>
      )}

      {mediaPickerOpen && (
        <div className="quote-quick-contact-modal">
          <div className="quote-quick-contact-modal__backdrop" onClick={() => setMediaPickerOpen(false)} />
          <div className="quote-quick-contact-modal__panel">
            <h3>Chọn tệp minh chứng</h3>
            <div className="admin-media-grid">
              {mediaAssets.map((asset) => (
                <button key={asset.id} type="button" className="admin-media-card" onClick={() => void addProof(asset.id)}>
                  {isImageMime(asset.mimeType) && asset.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={asset.thumbnailUrl} alt={asset.filename} />
                  ) : (
                    <div className="admin-media-card__file">{asset.filename}</div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </fieldset>
  );
}
