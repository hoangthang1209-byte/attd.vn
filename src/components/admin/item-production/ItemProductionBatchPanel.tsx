"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminLoadingState, EmptyState, StatusBadge } from "@/components/admin/AdminUi";
import AdminLoadingButton from "@/components/admin/feedback/AdminLoadingButton";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import {
  ITEM_PRODUCTION_BATCH_STATUS_LABELS,
  ITEM_PRODUCTION_RISK_LABELS,
} from "@/features/item-production-tracking/labels";
import type { ItemProductionBatchStatus, ItemProductionRiskStatus } from "@prisma/client";
import ItemProductionBatchStageDrawer from "@/components/admin/item-production/ItemProductionBatchStageDrawer";

type BatchRow = {
  id: string;
  code: string;
  name: string | null;
  plannedQuantity: number;
  readyQuantity: number;
  progressPercent: number | string;
  status: ItemProductionBatchStatus;
  riskStatus: ItemProductionRiskStatus;
  currentStageKey: string | null;
  plannedEndAt: string | null;
  lastProgressAt: string | null;
  supplier: { id: string; name: string; code: string } | null;
  picEmployee: { id: string; fullName: string; employeeCode: string } | null;
  stages: Array<{ id: string; stageKey: string; labelSnapshot: string; status: string }>;
};

type Props = {
  productionItemId: string;
  onClose: () => void;
  onUpdated: () => void;
};

function riskTone(risk: ItemProductionRiskStatus): "neutral" | "info" | "success" | "warning" | "danger" {
  if (risk === "ON_TRACK") return "success";
  if (risk === "NEEDS_ATTENTION") return "warning";
  return "danger";
}

export default function ItemProductionBatchPanel({ productionItemId, onClose, onUpdated }: Props) {
  const toast = useAdminToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [allocation, setAllocation] = useState({
    parentPlannedQuantity: 0,
    allocatedQuantity: 0,
    unallocatedQuantity: 0,
    batchCount: 0,
  });
  const [header, setHeader] = useState<{
    orderNo: string;
    customer: string;
    productName: string | null;
    sku: string | null;
    riskStatus?: string;
    promisedDeliveryDate?: string | null;
  } | null>(null);
  const [canStart, setCanStart] = useState<{ allowed: boolean; reason: string | null }>({
    allowed: true,
    reason: null,
  });
  const [showCreate, setShowCreate] = useState(false);
  const [pending, setPending] = useState(false);
  const [batchStageTarget, setBatchStageTarget] = useState<{ batchId: string; stageId: string } | null>(null);
  const [form, setForm] = useState({
    plannedQuantity: 0,
    supplierId: "",
    picEmployeeId: "",
    plannedStartAt: "",
    plannedEndAt: "",
    notes: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/manufacturing/production-items/${productionItemId}/batches`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Không tải được lô");
      setBatches(json.batches ?? []);
      setAllocation(json.allocationSummary ?? {});
      setCanStart(json.canStartBatches ?? { allowed: true, reason: null });
      const pi = json.productionItem;
      const order = pi?.orderItem?.order;
      setHeader({
        orderNo: order?.orderNo ?? "—",
        customer:
          order?.customer?.name ?? order?.customerCompanyName ?? order?.customerNameSnapshot ?? "—",
        productName: pi?.orderItem?.productNameSnapshot,
        sku: pi?.orderItem?.skuSnapshot,
        promisedDeliveryDate: pi?.promisedDeliveryDate,
      });
      setForm((f) => ({
        ...f,
        plannedQuantity: json.allocationSummary?.unallocatedQuantity ?? 0,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi tải");
    } finally {
      setLoading(false);
    }
  }, [productionItemId]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  async function createBatch() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/manufacturing/production-items/${productionItemId}/batches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plannedQuantity: form.plannedQuantity,
          supplierId: form.supplierId || null,
          picEmployeeId: form.picEmployeeId || null,
          plannedStartAt: form.plannedStartAt || null,
          plannedEndAt: form.plannedEndAt || null,
          notes: form.notes || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Tạo lô thất bại");
      toast.success("Đã tạo lô sản xuất");
      setShowCreate(false);
      onUpdated();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tạo lô thất bại");
    } finally {
      setPending(false);
    }
  }

  async function batchAction(batchId: string, action: "activate" | "complete" | "cancel") {
    setPending(true);
    try {
      const res = await fetch(`/api/manufacturing/production-batches/${batchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Thao tác thất bại");
      toast.success(json.message ?? "Đã cập nhật");
      onUpdated();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Thao tác thất bại");
    } finally {
      setPending(false);
    }
  }

  const availableAfterCreate = allocation.unallocatedQuantity - form.plannedQuantity;

  return (
    <div className="prod-plan-drawer-overlay" role="presentation" onClick={onClose}>
      <aside
        className="prod-plan-drawer"
        role="dialog"
        aria-label="Quản lý lô sản xuất"
        style={{ maxWidth: 720, width: "min(720px, 100vw)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="admin-section-header">
          <h2 className="admin-subtitle">Quản lý lô sản xuất</h2>
          <button type="button" className="admin-btn admin-btn--secondary" onClick={onClose}>
            Đóng
          </button>
        </div>

        {loading ? (
          <AdminLoadingState label="Đang tải lô…" rows={4} />
        ) : error && !header ? (
          <EmptyState tone="error" title="Không tải được lô" description={error} />
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            {error ? <p className="admin-error">{error}</p> : null}
            {header ? (
              <section className="admin-section-card" style={{ margin: 0 }}>
                <div className="admin-field-hint">Đơn {header.orderNo} · {header.customer}</div>
                <strong>{header.productName ?? "Sản phẩm"}</strong>
                <div className="admin-field-hint">SKU {header.sku ?? "—"}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 8 }}>
                  <div>
                    <div className="admin-field-hint">SL item</div>
                    <strong>{allocation.parentPlannedQuantity}</strong>
                  </div>
                  <div>
                    <div className="admin-field-hint">Đã phân bổ</div>
                    <strong>{allocation.allocatedQuantity}</strong>
                  </div>
                  <div>
                    <div className="admin-field-hint">Chưa phân bổ</div>
                    <strong style={{ color: allocation.unallocatedQuantity > 0 ? "#b45309" : undefined }}>
                      {allocation.unallocatedQuantity}
                    </strong>
                  </div>
                </div>
              </section>
            ) : null}

            {!canStart.allowed ? (
              <p className="admin-error" style={{ margin: 0 }}>{canStart.reason}</p>
            ) : null}

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {canStart.allowed ? (
                <button
                  type="button"
                  className="admin-btn admin-btn--primary"
                  onClick={() => setShowCreate((v) => !v)}
                  disabled={allocation.unallocatedQuantity <= 0 && batches.length === 0}
                >
                  {batches.length === 0 ? "Chia lô sản xuất" : "Tạo lô mới"}
                </button>
              ) : null}
            </div>

            {showCreate && canStart.allowed ? (
              <section className="admin-section-card" style={{ margin: 0 }}>
                <h3 className="admin-subtitle" style={{ marginTop: 0 }}>Tạo lô mới</h3>
                <div style={{ display: "grid", gap: 8 }}>
                  <div className="admin-field-hint">
                    SL item: {allocation.parentPlannedQuantity} · Đã phân bổ: {allocation.allocatedQuantity} · Còn:{" "}
                    {allocation.unallocatedQuantity}
                  </div>
                  <label className="admin-label">
                    Số lượng lô
                    <input
                      className="admin-input"
                      type="number"
                      min={1}
                      max={allocation.unallocatedQuantity}
                      value={form.plannedQuantity}
                      onChange={(e) => setForm({ ...form, plannedQuantity: Number(e.target.value) || 0 })}
                    />
                  </label>
                  <div className="admin-field-hint">
                    Sau khi tạo còn: {Math.max(0, availableAfterCreate)}
                  </div>
                  <label className="admin-label">
                    Ghi chú
                    <textarea className="admin-input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                  </label>
                  <AdminLoadingButton pending={pending} variant="primary" onClick={() => void createBatch()}>
                    Tạo lô
                  </AdminLoadingButton>
                </div>
              </section>
            ) : null}

            <section className="admin-section-card" style={{ margin: 0 }}>
              <h3 className="admin-subtitle" style={{ marginTop: 0 }}>
                {batches.length} lô
              </h3>
              {batches.length === 0 ? (
                <p className="admin-field-hint">Chưa có lô sản xuất.</p>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {batches.map((batch) => {
                    const progress = Number(batch.progressPercent);
                    const activeStage = batch.stages.find((s) => s.status === "IN_PROGRESS" || s.status === "BLOCKED");
                    return (
                      <div
                        key={batch.id}
                        style={{
                          border: "1px solid #e5e7eb",
                          borderRadius: 8,
                          padding: 12,
                          display: "grid",
                          gap: 8,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                          <div>
                            <strong>{batch.code}</strong>
                            <div className="admin-field-hint">
                              {batch.name ?? "Lô"} · {batch.plannedQuantity} cái
                            </div>
                          </div>
                          <StatusBadge tone={batch.status === "ACTIVE" ? "info" : "neutral"}>
                            {ITEM_PRODUCTION_BATCH_STATUS_LABELS[batch.status]}
                          </StatusBadge>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                          <div>
                            <div className="admin-field-hint">Xưởng</div>
                            <div>{batch.supplier?.name ?? "—"}</div>
                          </div>
                          <div>
                            <div className="admin-field-hint">PIC</div>
                            <div>{batch.picEmployee?.fullName ?? "—"}</div>
                          </div>
                          <div>
                            <div className="admin-field-hint">Công đoạn</div>
                            <div>{activeStage?.labelSnapshot ?? "—"}</div>
                          </div>
                        </div>
                        <div style={{ height: 6, borderRadius: 999, background: "#e5e7eb" }}>
                          <div style={{ width: `${Math.min(100, progress)}%`, height: "100%", background: "#2563eb" }} />
                        </div>
                        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                          <span>{progress.toLocaleString("vi-VN")}%</span>
                          <span className="admin-field-hint">Sẵn sàng: {batch.readyQuantity}</span>
                          <StatusBadge tone={riskTone(batch.riskStatus)}>
                            {ITEM_PRODUCTION_RISK_LABELS[batch.riskStatus]}
                          </StatusBadge>
                        </div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {batch.status === "DRAFT" ? (
                            <AdminLoadingButton pending={pending} onClick={() => void batchAction(batch.id, "activate")}>
                              Kích hoạt
                            </AdminLoadingButton>
                          ) : null}
                          {batch.status === "ACTIVE" && activeStage ? (
                            <button
                              type="button"
                              className="admin-btn admin-btn--secondary admin-btn--small"
                              onClick={() => setBatchStageTarget({ batchId: batch.id, stageId: activeStage.id })}
                            >
                              Cập nhật công đoạn
                            </button>
                          ) : null}
                          {batch.status === "ACTIVE" ? (
                            <AdminLoadingButton pending={pending} onClick={() => void batchAction(batch.id, "complete")}>
                              Hoàn tất lô
                            </AdminLoadingButton>
                          ) : null}
                          {batch.status === "DRAFT" ? (
                            <AdminLoadingButton pending={pending} variant="secondary" onClick={() => void batchAction(batch.id, "cancel")}>
                              Hủy lô
                            </AdminLoadingButton>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}

        {batchStageTarget ? (
          <ItemProductionBatchStageDrawer
            batchId={batchStageTarget.batchId}
            batchStageId={batchStageTarget.stageId}
            onClose={() => setBatchStageTarget(null)}
            onUpdated={() => {
              toast.success("Đã cập nhật tiến độ lô");
              onUpdated();
              void load();
            }}
          />
        ) : null}
      </aside>
    </div>
  );
}
