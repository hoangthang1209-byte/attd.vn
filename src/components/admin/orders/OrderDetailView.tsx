"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { OrderPaymentMethod, OrderPaymentType, OrderStatus } from "@prisma/client";
import AdminPageSkeleton from "@/components/admin/feedback/AdminPageSkeleton";
import OrderWorkspaceShell from "@/components/admin/orders/workspace/OrderWorkspaceShell";
import type { OrderDetailRecord } from "@/features/orders/order.types";
import type { EmployeeRecord } from "@/features/employees/employee.service";
import {
  formatOrderDateTime,
  toDateTimeLocalValue,
} from "@/features/orders/order-format";
import {
  getAllowedOrderStatusTransitions,
  getOrderStatusCorrectionTargets,
  isOrderEditable,
} from "@/features/orders/order-status";
import {
  ORDER_PAYMENT_METHOD_LABELS,
  ORDER_PAYMENT_TYPE_LABELS,
  ORDER_STATUS_LABELS,
} from "@/features/orders/order-labels";
import type { DeliveryCarrierRecord } from "@/features/delivery/delivery-carrier.service";
import type { DeliveryMethodRecord } from "@/features/delivery/delivery-method.service";
import { toDateInputValue } from "@/features/quotes/format";
import { useAdminMutation } from "@/hooks/useAdminAction";
import { parseAdminJsonResponse } from "@/lib/admin/adminMutation";
import type { ProductionReadinessResult } from "@/features/orders/production-readiness.service";
import type { HandoverReadinessResult } from "@/features/orders/handover-readiness.service";
import type { CompletionReadinessResult } from "@/features/orders/delivery-fulfillment.service";
import { useAdminPermissions } from "@/components/admin/AdminPermissionsContext";

type Props = { id: string };

function syncProductionFields(order: OrderDetailRecord) {
  return {
    productionOwnerId: order.productionOwnerId ?? "",
    productionDueDate: order.productionDueDate ? toDateInputValue(order.productionDueDate) : "",
    productionNote: order.productionNote ?? "",
  };
}

function syncDeliveryFields(order: OrderDetailRecord) {
  return {
    deliveryMethodId: order.deliveryMethodId ?? "",
    deliveryOwnerId: order.deliveryOwnerId ?? "",
    deliveryCarrierId: order.deliveryCarrierId ?? "",
    deliveryTrackingCode: order.deliveryTrackingCode ?? "",
    deliveryRecipientName: order.deliveryRecipientName ?? order.contactName ?? "",
    deliveryRecipientPhone: order.deliveryRecipientPhone ?? order.contactPhone ?? "",
    deliveryAddress: order.deliveryAddress ?? order.customerAddress ?? "",
    deliveryExpectedAt: order.deliveryExpectedAt ? toDateInputValue(order.deliveryExpectedAt) : "",
    deliveryNote: order.deliveryNote ?? "",
  };
}

export default function OrderDetailView({ id }: Props) {
  const searchParams = useSearchParams();
  const mutate = useAdminMutation();
  const { permissions } = useAdminPermissions();
  const canViewFinancials = permissions.canViewFinancials;
  const listBackHref = useMemo(() => {
    if (searchParams.get("from") === "list") {
      const qs = searchParams.get("qs");
      return qs ? `/admin/orders?${qs}` : "/admin/orders";
    }
    return "/admin/orders";
  }, [searchParams]);
  const [order, setOrder] = useState<OrderDetailRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [correctionStatus, setCorrectionStatus] = useState<OrderStatus | null>(null);
  const [correctionReason, setCorrectionReason] = useState("");
  const [voidOpen, setVoidOpen] = useState(false);
  const [voidPaymentId, setVoidPaymentId] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [editPaymentOpen, setEditPaymentOpen] = useState(false);
  const [editPaymentId, setEditPaymentId] = useState<string | null>(null);
  const [paymentType, setPaymentType] = useState<OrderPaymentType>("DEPOSIT");
  const [paymentMethod, setPaymentMethod] = useState<OrderPaymentMethod>("BANK_TRANSFER");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(toDateTimeLocalValue());
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [paymentEditReason, setPaymentEditReason] = useState("");
  const [productionFields, setProductionFields] = useState({
    productionOwnerId: "",
    productionDueDate: "",
    productionNote: "",
  });
  const [deliveryFields, setDeliveryFields] = useState({
    deliveryMethodId: "",
    deliveryOwnerId: "",
    deliveryCarrierId: "",
    deliveryTrackingCode: "",
    deliveryRecipientName: "",
    deliveryRecipientPhone: "",
    deliveryAddress: "",
    deliveryExpectedAt: "",
    deliveryNote: "",
  });
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [productionEmployees, setProductionEmployees] = useState<EmployeeRecord[]>([]);
  const [deliveryMethods, setDeliveryMethods] = useState<DeliveryMethodRecord[]>([]);
  const [carriers, setCarriers] = useState<DeliveryCarrierRecord[]>([]);
  const [readinessOpen, setReadinessOpen] = useState(false);
  const [readinessData, setReadinessData] = useState<ProductionReadinessResult | null>(null);
  const [readinessAck, setReadinessAck] = useState(false);
  const [handoverOpen, setHandoverOpen] = useState(false);
  const [handoverData, setHandoverData] = useState<HandoverReadinessResult | null>(null);
  const [handoverAck, setHandoverAck] = useState(false);
  const [handoverReason, setHandoverReason] = useState("");
  const [partialDeliveryAck, setPartialDeliveryAck] = useState(false);
  const [shippedOpen, setShippedOpen] = useState(false);
  const [shippedMissing, setShippedMissing] = useState<string[]>([]);
  const [shippedRequiresExecution, setShippedRequiresExecution] = useState(false);
  const [shippedAck, setShippedAck] = useState(false);
  const [shippedReason, setShippedReason] = useState("");
  const [completionOpen, setCompletionOpen] = useState(false);
  const [completionData, setCompletionData] = useState<CompletionReadinessResult | null>(null);
  const [completionAck, setCompletionAck] = useState(false);
  const [completionReason, setCompletionReason] = useState("");
  const [deliveryRefreshKey, setDeliveryRefreshKey] = useState(0);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/orders/${id}`);
    const data = await res.json() as { order?: OrderDetailRecord; message?: string };
    if (!res.ok) {
      setError(data.message ?? "Không tìm thấy đơn hàng");
      setOrder(null);
    } else {
      const next = data.order ?? null;
      setOrder(next);
      if (next) {
        setProductionFields(syncProductionFields(next));
        setDeliveryFields(syncDeliveryFields(next));
      }
    }
    setLoading(false);
  }

  useEffect(() => {
    void Promise.all([
      fetch("/api/employees?active=1&limit=200").then((r) => r.json()),
      fetch("/api/employees?active=1&role=PRODUCTION&limit=200").then((r) => r.json()),
      fetch("/api/delivery-methods?active=1").then((r) => r.json()),
      fetch("/api/delivery-carriers?active=1").then((r) => r.json()),
    ]).then(([empData, prodEmpData, dmData, carrierData]) => {
      setEmployees((empData as { employees?: EmployeeRecord[] }).employees ?? []);
      setProductionEmployees((prodEmpData as { employees?: EmployeeRecord[] }).employees ?? []);
      setDeliveryMethods((dmData as { deliveryMethods?: DeliveryMethodRecord[] }).deliveryMethods ?? []);
      setCarriers((carrierData as { deliveryCarriers?: DeliveryCarrierRecord[] }).deliveryCarriers ?? []);
    });
  }, []);

  useEffect(() => { void load(); }, [id]);

  useEffect(() => {
    const carrierId = order?.deliveryCarrierId;
    if (!carrierId) return;
    void fetch(`/api/delivery-carriers/${carrierId}`)
      .then((r) => r.json())
      .then((data: { deliveryCarrier?: DeliveryCarrierRecord }) => {
        if (data.deliveryCarrier) {
          setCarriers((prev) =>
            prev.some((c) => c.id === data.deliveryCarrier!.id)
              ? prev
              : [...prev, data.deliveryCarrier!],
          );
        }
      });
  }, [order?.deliveryCarrierId]);

  async function updateStatus(
    status: OrderStatus,
    options?: {
      cancelReason?: string;
      correctionReason?: string;
      productionReadinessAcknowledged?: boolean;
      handoverReadinessAcknowledged?: boolean;
      handoverOverrideReason?: string;
      partialDeliveryAcknowledged?: boolean;
      shippedExecutionAcknowledged?: boolean;
      shippedOverrideReason?: string;
      completionReadinessAcknowledged?: boolean;
      completionOverrideReason?: string;
    },
  ) {
    setBusy(true);
    await mutate({
      loadingMessage: "Đang cập nhật trạng thái…",
      successMessage: "Đã cập nhật trạng thái đơn hàng.",
      action: async () => {
        const res = await fetch(`/api/orders/${id}/status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status,
            cancelReason: options?.cancelReason ?? null,
            correctionReason: options?.correctionReason ?? null,
            productionReadinessAcknowledged: options?.productionReadinessAcknowledged ?? false,
            handoverReadinessAcknowledged: options?.handoverReadinessAcknowledged ?? false,
            handoverOverrideReason: options?.handoverOverrideReason ?? null,
            partialDeliveryAcknowledged: options?.partialDeliveryAcknowledged ?? false,
            shippedExecutionAcknowledged: options?.shippedExecutionAcknowledged ?? false,
            shippedOverrideReason: options?.shippedOverrideReason ?? null,
            completionReadinessAcknowledged: options?.completionReadinessAcknowledged ?? false,
            completionOverrideReason: options?.completionOverrideReason ?? null,
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({})) as {
            message?: string;
            code?: string;
            missingConditions?: string[];
            requiresExecutionFlow?: boolean;
          };
          if (body.code === "HANDOVER_NOT_READY") {
            setHandoverData({
              state: "NOT_READY",
              stateLabel: "Chưa đủ điều kiện",
              isReady: false,
              missingConditions: body.missingConditions ?? [],
              expectedOrderQuantity: 0,
              productionCompletedQuantity: 0,
              qcPassedQuantity: 0,
              reworkQuantity: 0,
              defectAndScrapQuantity: 0,
              packingCompleted: false,
              packingSkipped: false,
              stageProgressLabel: "",
              qcStatusLabel: "",
              hasBlockedStage: false,
              partialDeliveryAllowed: false,
              usedOverride: false,
              overrideReason: null,
            });
            setHandoverAck(false);
            setHandoverReason("");
            setHandoverOpen(true);
            return { ok: false as const, message: body.message };
          }
          if (body.code === "SHIPPED_EXECUTION_REQUIRED") {
            setShippedMissing(body.missingConditions ?? []);
            setShippedRequiresExecution(body.requiresExecutionFlow === true);
            setShippedAck(false);
            setShippedReason("");
            setShippedOpen(true);
            return { ok: false as const, message: body.message };
          }
          if (body.code === "COMPLETION_NOT_READY") {
            const readyRes = await fetch(`/api/orders/${id}/completion-readiness`);
            const readyData = await readyRes.json() as { readiness?: CompletionReadinessResult };
            setCompletionData(readyData.readiness ?? null);
            setCompletionAck(false);
            setCompletionReason("");
            setCompletionOpen(true);
            return { ok: false as const, message: body.message };
          }
          return { ok: false as const, message: body.message ?? "Không thể cập nhật trạng thái" };
        }
        return parseAdminJsonResponse(res, (body) => body.order as OrderDetailRecord);
      },
      onSuccess: (orderData) => {
        setOrder(orderData);
        setCancelOpen(false);
        setCancelReason("");
        setCorrectionOpen(false);
        setCorrectionStatus(null);
        setCorrectionReason("");
        setReadinessOpen(false);
        setReadinessAck(false);
        setReadinessData(null);
        setHandoverOpen(false);
        setHandoverAck(false);
        setHandoverReason("");
        setHandoverData(null);
        setPartialDeliveryAck(false);
        setShippedOpen(false);
        setShippedAck(false);
        setShippedReason("");
        setShippedMissing([]);
        setCompletionOpen(false);
        setCompletionAck(false);
        setCompletionReason("");
        setCompletionData(null);
        setDeliveryRefreshKey((k) => k + 1);
      },
    });
    setBusy(false);
  }

  async function requestStatusChange(status: OrderStatus) {
    if (status === "IN_PRODUCTION") {
      try {
        const res = await fetch(`/api/orders/${id}/materials`);
        const data = await res.json() as { readiness?: ProductionReadinessResult };
        if (data.readiness?.isReady) {
          await updateStatus(status);
          return;
        }
        setReadinessData(data.readiness ?? null);
        setReadinessAck(false);
        setReadinessOpen(true);
      } catch {
        await updateStatus(status);
      }
      return;
    }
    if (status === "READY_TO_SHIP") {
      try {
        const res = await fetch(`/api/orders/${id}/handover-readiness`);
        const data = await res.json() as { readiness?: HandoverReadinessResult };
        if (data.readiness?.isReady) {
          await updateStatus(status);
          return;
        }
        setHandoverData(data.readiness ?? null);
        setHandoverAck(false);
        setHandoverReason("");
        setPartialDeliveryAck(false);
        setHandoverOpen(true);
      } catch {
        await updateStatus(status);
      }
      return;
    }
    if (status === "SHIPPED") {
      try {
        const execRes = await fetch(`/api/orders/${id}/delivery-executions`);
        const execData = await execRes.json() as { executions?: Array<{ status: string }> };
        const hasReady = (execData.executions ?? []).some((e) =>
          e.status === "DISPATCHED" || e.status === "IN_TRANSIT",
        );
        if (hasReady) {
          await updateStatus(status);
          return;
        }
        setShippedMissing(["Chưa có chuyến giao hàng đã xuất hoặc đang giao."]);
        setShippedRequiresExecution(true);
        setShippedAck(false);
        setShippedReason("");
        setShippedOpen(true);
      } catch {
        await updateStatus(status);
      }
      return;
    }
    if (status === "COMPLETED") {
      try {
        const res = await fetch(`/api/orders/${id}/completion-readiness`);
        const data = await res.json() as { readiness?: CompletionReadinessResult };
        if (data.readiness?.isReady) {
          await updateStatus(status);
          return;
        }
        setCompletionData(data.readiness ?? null);
        setCompletionAck(false);
        setCompletionReason("");
        setCompletionOpen(true);
      } catch {
        await updateStatus(status);
      }
      return;
    }
    await updateStatus(status);
  }

  async function submitPayment(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    await mutate({
      loadingMessage: "Đang ghi nhận thanh toán…",
      successMessage: "Đã ghi nhận thanh toán.",
      action: async () => {
        const res = await fetch(`/api/orders/${id}/payments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: paymentType,
            method: paymentMethod,
            amount: Number(paymentAmount),
            paidAt: new Date(paymentDate).toISOString(),
            referenceCode: paymentReference || null,
            note: paymentNote || null,
          }),
        });
        return parseAdminJsonResponse(res, (body) => body.order as OrderDetailRecord);
      },
      onSuccess: (orderData) => {
        setOrder(orderData);
        setPaymentOpen(false);
        setPaymentAmount("");
        setPaymentReference("");
        setPaymentNote("");
      },
    });
    setBusy(false);
  }

  function openEditPayment(paymentId: string) {
    const payment = order?.payments.find((p) => p.id === paymentId);
    if (!payment) return;
    setEditPaymentId(paymentId);
    setPaymentType(payment.type);
    setPaymentMethod(payment.method);
    setPaymentAmount(String(payment.amount));
    setPaymentDate(toDateTimeLocalValue(payment.paidAt));
    setPaymentReference(payment.referenceCode ?? "");
    setPaymentNote(payment.note ?? "");
    setPaymentEditReason("");
    setEditPaymentOpen(true);
  }

  async function submitEditPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!editPaymentId) return;
    setBusy(true);
    await mutate({
      loadingMessage: "Đang cập nhật thanh toán…",
      successMessage: "Đã cập nhật ghi nhận thanh toán.",
      action: async () => {
        const res = await fetch(`/api/orders/${id}/payments/${editPaymentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: paymentType,
            method: paymentMethod,
            amount: Number(paymentAmount),
            paidAt: new Date(paymentDate).toISOString(),
            referenceCode: paymentReference || null,
            note: paymentNote || null,
            editReason: paymentEditReason,
          }),
        });
        return parseAdminJsonResponse(res, (body) => body.order as OrderDetailRecord);
      },
      onSuccess: (orderData) => {
        setOrder(orderData);
        setEditPaymentOpen(false);
        setEditPaymentId(null);
      },
    });
    setBusy(false);
  }

  function openVoidPayment(paymentId: string) {
    setVoidPaymentId(paymentId);
    setVoidReason("");
    setVoidOpen(true);
  }

  async function submitVoidPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!voidPaymentId) return;
    setBusy(true);
    await mutate({
      loadingMessage: "Đang hủy ghi nhận thanh toán…",
      successMessage: "Đã hủy ghi nhận thanh toán.",
      action: async () => {
        const res = await fetch(`/api/orders/${id}/payments/${voidPaymentId}/void`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ voidReason: voidReason || null }),
        });
        return parseAdminJsonResponse(res, (body) => body.order as OrderDetailRecord);
      },
      onSuccess: (orderData) => {
        setOrder(orderData);
        setVoidOpen(false);
        setVoidPaymentId(null);
        setVoidReason("");
      },
    });
    setBusy(false);
  }

  async function saveProductionInternal(override?: Partial<typeof productionFields>) {
    const payload = { ...productionFields, ...override };
    setBusy(true);
    await mutate({
      loadingMessage: "Đang lưu thông tin…",
      successMessage: "Đã lưu thông tin sản xuất.",
      action: async () => {
        const res = await fetch(`/api/orders/${id}/production`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productionOwnerId: payload.productionOwnerId || null,
            productionDueDate: payload.productionDueDate
              ? new Date(payload.productionDueDate).toISOString()
              : null,
            productionNote: payload.productionNote || null,
          }),
        });
        return parseAdminJsonResponse(res, (body) => body.order as OrderDetailRecord);
      },
      onSuccess: (orderData) => {
        setOrder(orderData);
        setProductionFields(syncProductionFields(orderData));
      },
    });
    setBusy(false);
  }

  async function saveProduction(e: React.FormEvent) {
    e.preventDefault();
    await saveProductionInternal();
  }

  async function saveDeliveryInternal(override?: Partial<typeof deliveryFields>) {
    const payload = { ...deliveryFields, ...override };
    setBusy(true);
    await mutate({
      loadingMessage: "Đang lưu thông tin…",
      successMessage: "Đã lưu thông tin giao hàng.",
      action: async () => {
        const res = await fetch(`/api/orders/${id}/delivery`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            deliveryMethodId: payload.deliveryMethodId || null,
            deliveryOwnerId: payload.deliveryOwnerId || null,
            deliveryCarrierId: payload.deliveryCarrierId || null,
            deliveryTrackingCode: payload.deliveryTrackingCode || null,
            deliveryRecipientName: payload.deliveryRecipientName || null,
            deliveryRecipientPhone: payload.deliveryRecipientPhone || null,
            deliveryAddress: payload.deliveryAddress || null,
            deliveryExpectedAt: payload.deliveryExpectedAt
              ? new Date(payload.deliveryExpectedAt).toISOString()
              : null,
            deliveryNote: payload.deliveryNote || null,
          }),
        });
        return parseAdminJsonResponse(res, (body) => body.order as OrderDetailRecord);
      },
      onSuccess: (orderData) => {
        setOrder(orderData);
        setDeliveryFields(syncDeliveryFields(orderData));
      },
    });
    setBusy(false);
  }

  async function saveDelivery(e: React.FormEvent) {
    e.preventDefault();
    await saveDeliveryInternal();
  }

  if (loading) return <AdminPageSkeleton message="Đang tải đơn hàng…" />;
  if (error || !order) {
    return (
      <div className="admin-empty-state admin-empty-state--error">
        <p>{error ?? "Không tìm thấy đơn hàng"}</p>
        <Link href="/admin/orders" className="admin-btn">Quay lại</Link>
      </div>
    );
  }

  const transitions = getAllowedOrderStatusTransitions(order.status);
  const correctionTargets = getOrderStatusCorrectionTargets(order.status);
  const canRecordPayment =
    canViewFinancials && order.status !== "COMPLETED" && order.status !== "CANCELLED";
  const canEditOrder = canViewFinancials && isOrderEditable(order.status);
  const showDeliveryForm = order.status !== "SHIPPED" && order.status !== "COMPLETED" && order.status !== "CANCELLED";

  return (
    <div className="admin-panel">
      <OrderWorkspaceShell
        orderId={id}
        order={order}
        listBackHref={listBackHref}
        busy={busy}
        canEditOrder={canEditOrder}
        canRecordPayment={canRecordPayment}
        showDeliveryForm={showDeliveryForm}
        transitions={transitions}
        correctionTargets={correctionTargets}
        productionFields={productionFields}
        deliveryFields={deliveryFields}
        productionEmployees={productionEmployees}
        employees={employees}
        deliveryMethods={deliveryMethods}
        carriers={carriers}
        deliveryRefreshKey={deliveryRefreshKey}
        onProductionFieldsChange={setProductionFields}
        onProductionEmployeesChange={setProductionEmployees}
        onDeliveryFieldsChange={setDeliveryFields}
        onCarriersChange={setCarriers}
        onSaveProduction={(e) => void saveProduction(e)}
        onSaveDelivery={(e) => void saveDelivery(e)}
        onProductionEmployeeCreated={(employee) => {
          void saveProductionInternal({ productionOwnerId: employee.id });
        }}
        onCarrierCreated={(carrier) => {
          void saveDeliveryInternal({ deliveryCarrierId: carrier.id });
        }}
        onDeliveryRefresh={() => setDeliveryRefreshKey((k) => k + 1)}
        onRequestStatusChange={(status) => void requestStatusChange(status)}
        onOpenCancel={() => setCancelOpen(true)}
        onOpenCorrection={(status) => {
          setCorrectionStatus(status);
          setCorrectionReason("");
          setCorrectionOpen(true);
        }}
        onOpenRecordPayment={() => setPaymentOpen(true)}
        onOpenEditPayment={openEditPayment}
        onOpenVoidPayment={openVoidPayment}
      />

      {cancelOpen && (
        <div className="quote-quick-contact-modal">
          <div className="quote-quick-contact-modal__backdrop" onClick={() => setCancelOpen(false)} />
          <form
            className="quote-quick-contact-modal__panel"
            onSubmit={(e) => {
              e.preventDefault();
              void updateStatus("CANCELLED", { cancelReason });
            }}
          >
            <h3 className="quote-quick-contact-modal__title">Hủy đơn hàng</h3>
            <div className="admin-field">
              <label className="admin-label">Lý do hủy đơn hàng</label>
              <textarea className="admin-textarea" rows={3} required value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
            </div>
            <div className="quote-quick-contact-modal__actions">
              <button type="button" className="admin-btn admin-btn--secondary" onClick={() => setCancelOpen(false)}>Đóng</button>
              <button type="submit" className="admin-btn admin-btn--primary" disabled={busy}>Xác nhận hủy</button>
            </div>
          </form>
        </div>
      )}

      {correctionOpen && correctionStatus && (
        <div className="quote-quick-contact-modal">
          <div className="quote-quick-contact-modal__backdrop" onClick={() => setCorrectionOpen(false)} />
          <form
            className="quote-quick-contact-modal__panel"
            onSubmit={(e) => {
              e.preventDefault();
              void updateStatus(correctionStatus, { correctionReason });
            }}
          >
            <h3 className="quote-quick-contact-modal__title">Điều chỉnh trạng thái</h3>
            <p className="admin-field-hint">
              Chuyển từ {ORDER_STATUS_LABELS[order.status]} sang {ORDER_STATUS_LABELS[correctionStatus]}
            </p>
            <div className="admin-field">
              <label className="admin-label">Lý do điều chỉnh</label>
              <textarea className="admin-textarea" rows={3} required value={correctionReason} onChange={(e) => setCorrectionReason(e.target.value)} />
            </div>
            <div className="quote-quick-contact-modal__actions">
              <button type="button" className="admin-btn admin-btn--secondary" onClick={() => setCorrectionOpen(false)}>Đóng</button>
              <button type="submit" className="admin-btn admin-btn--primary" disabled={busy}>Xác nhận</button>
            </div>
          </form>
        </div>
      )}

      {voidOpen && (
        <div className="quote-quick-contact-modal">
          <div className="quote-quick-contact-modal__backdrop" onClick={() => setVoidOpen(false)} />
          <form className="quote-quick-contact-modal__panel" onSubmit={(e) => void submitVoidPayment(e)}>
            <h3 className="quote-quick-contact-modal__title">Hủy ghi nhận thanh toán</h3>
            <div className="admin-field">
              <label className="admin-label">Lý do hủy ghi nhận (tuỳ chọn)</label>
              <textarea className="admin-textarea" rows={3} value={voidReason} onChange={(e) => setVoidReason(e.target.value)} />
            </div>
            <div className="quote-quick-contact-modal__actions">
              <button type="button" className="admin-btn admin-btn--secondary" onClick={() => setVoidOpen(false)}>Đóng</button>
              <button type="submit" className="admin-btn admin-btn--primary" disabled={busy}>Xác nhận hủy</button>
            </div>
          </form>
        </div>
      )}

      {paymentOpen && (
        <div className="quote-quick-contact-modal">
          <div className="quote-quick-contact-modal__backdrop" onClick={() => setPaymentOpen(false)} />
          <form className="quote-quick-contact-modal__panel" onSubmit={(e) => void submitPayment(e)}>
            <h3 className="quote-quick-contact-modal__title">Ghi nhận thanh toán</h3>
            <div className="admin-field">
              <label className="admin-label">Loại thanh toán</label>
              <select className="admin-input" value={paymentType} onChange={(e) => setPaymentType(e.target.value as OrderPaymentType)}>
                {(Object.keys(ORDER_PAYMENT_TYPE_LABELS) as OrderPaymentType[]).map((t) => (
                  <option key={t} value={t}>{ORDER_PAYMENT_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>
            <div className="admin-field">
              <label className="admin-label">Phương thức</label>
              <select className="admin-input" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as OrderPaymentMethod)}>
                {(Object.keys(ORDER_PAYMENT_METHOD_LABELS) as OrderPaymentMethod[]).map((m) => (
                  <option key={m} value={m}>{ORDER_PAYMENT_METHOD_LABELS[m]}</option>
                ))}
              </select>
            </div>
            <div className="admin-field">
              <label className="admin-label">Số tiền</label>
              <input className="admin-input" type="number" min="1" required value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} />
            </div>
            <div className="admin-field">
              <label className="admin-label">Ngày thanh toán</label>
              <input className="admin-input" type="datetime-local" required value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
            </div>
            <div className="admin-field">
              <label className="admin-label">Mã tham chiếu</label>
              <input className="admin-input" value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} />
            </div>
            <div className="admin-field">
              <label className="admin-label">Ghi chú</label>
              <textarea className="admin-textarea" rows={2} value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)} />
            </div>
            <div className="quote-quick-contact-modal__actions">
              <button type="button" className="admin-btn admin-btn--secondary" onClick={() => setPaymentOpen(false)}>Đóng</button>
              <button type="submit" className="admin-btn admin-btn--primary" disabled={busy}>Ghi nhận</button>
            </div>
          </form>
        </div>
      )}

      {editPaymentOpen && (
        <div className="quote-quick-contact-modal">
          <div className="quote-quick-contact-modal__backdrop" onClick={() => setEditPaymentOpen(false)} />
          <form className="quote-quick-contact-modal__panel" onSubmit={(e) => void submitEditPayment(e)}>
            <h3 className="quote-quick-contact-modal__title">Chỉnh sửa ghi nhận thanh toán</h3>
            <div className="admin-field">
              <label className="admin-label">Loại thanh toán</label>
              <select className="admin-input" value={paymentType} onChange={(e) => setPaymentType(e.target.value as OrderPaymentType)}>
                {(Object.keys(ORDER_PAYMENT_TYPE_LABELS) as OrderPaymentType[]).map((t) => (
                  <option key={t} value={t}>{ORDER_PAYMENT_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>
            <div className="admin-field">
              <label className="admin-label">Phương thức</label>
              <select className="admin-input" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as OrderPaymentMethod)}>
                {(Object.keys(ORDER_PAYMENT_METHOD_LABELS) as OrderPaymentMethod[]).map((m) => (
                  <option key={m} value={m}>{ORDER_PAYMENT_METHOD_LABELS[m]}</option>
                ))}
              </select>
            </div>
            <div className="admin-field">
              <label className="admin-label">Số tiền</label>
              <input className="admin-input" type="number" min="1" required value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} />
            </div>
            <div className="admin-field">
              <label className="admin-label">Ngày thanh toán</label>
              <input className="admin-input" type="datetime-local" required value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
            </div>
            <div className="admin-field">
              <label className="admin-label">Mã tham chiếu</label>
              <input className="admin-input" value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} />
            </div>
            <div className="admin-field">
              <label className="admin-label">Ghi chú</label>
              <textarea className="admin-textarea" rows={2} value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)} />
            </div>
            <div className="admin-field">
              <label className="admin-label">Lý do chỉnh sửa</label>
              <textarea className="admin-textarea" rows={2} required value={paymentEditReason} onChange={(e) => setPaymentEditReason(e.target.value)} />
            </div>
            <div className="quote-quick-contact-modal__actions">
              <button type="button" className="admin-btn admin-btn--secondary" onClick={() => setEditPaymentOpen(false)}>Đóng</button>
              <button type="submit" className="admin-btn admin-btn--primary" disabled={busy}>Lưu</button>
            </div>
          </form>
        </div>
      )}

      {handoverOpen && (
        <div className="quote-quick-contact-modal">
          <div className="quote-quick-contact-modal__backdrop" onClick={() => setHandoverOpen(false)} />
          <div className="quote-quick-contact-modal__panel">
            <h3 className="quote-quick-contact-modal__title">Đơn hàng chưa đủ điều kiện sẵn sàng giao</h3>
            <ul className="production-readiness-list">
              {(handoverData?.missingConditions ?? []).map((label) => (
                <li key={label}>{label}</li>
              ))}
            </ul>
            {handoverData?.partialDeliveryAllowed && (
              <label className="admin-field" style={{ display: "flex", gap: 8, alignItems: "flex-start", marginTop: 12 }}>
                <input
                  type="checkbox"
                  checked={partialDeliveryAck}
                  onChange={(e) => setPartialDeliveryAck(e.target.checked)}
                />
                <span>Xác nhận giao một phần (số lượng QC đạt chưa đủ tổng đơn).</span>
              </label>
            )}
            <label className="admin-field" style={{ display: "flex", gap: 8, alignItems: "flex-start", marginTop: 12 }}>
              <input
                type="checkbox"
                checked={handoverAck}
                onChange={(e) => setHandoverAck(e.target.checked)}
              />
              <span>Tôi xác nhận chuyển đơn sang Sẵn sàng giao khi hồ sơ hoàn thành chưa đầy đủ.</span>
            </label>
            {handoverAck && (
              <div className="admin-field" style={{ marginTop: 12 }}>
                <label className="admin-label">Lý do xác nhận</label>
                <textarea
                  className="admin-textarea"
                  rows={3}
                  required
                  value={handoverReason}
                  onChange={(e) => setHandoverReason(e.target.value)}
                />
              </div>
            )}
            <div className="quote-quick-contact-modal__actions">
              <button type="button" className="admin-btn admin-btn--secondary" onClick={() => setHandoverOpen(false)}>Quay lại</button>
              <button
                type="button"
                className="admin-btn admin-btn--primary"
                disabled={
                  busy ||
                  !(
                    (partialDeliveryAck && handoverData?.partialDeliveryAllowed) ||
                    (handoverAck && handoverReason.trim())
                  )
                }
                onClick={() =>
                  void updateStatus("READY_TO_SHIP", {
                    handoverReadinessAcknowledged: handoverAck || partialDeliveryAck,
                    handoverOverrideReason: handoverAck ? handoverReason : undefined,
                    partialDeliveryAcknowledged: partialDeliveryAck,
                  })
                }
              >
                Chuyển sang Sẵn sàng giao
              </button>
            </div>
          </div>
        </div>
      )}

      {readinessOpen && (
        <div className="quote-quick-contact-modal">
          <div className="quote-quick-contact-modal__backdrop" onClick={() => setReadinessOpen(false)} />
          <div className="quote-quick-contact-modal__panel">
            <h3 className="quote-quick-contact-modal__title">Hồ sơ sản xuất chưa đầy đủ</h3>
            <p className="admin-field-hint">Các mục còn thiếu trước khi bắt đầu sản xuất:</p>
            <ul className="production-readiness-list">
              {(readinessData?.missingMandatory ?? []).map((label) => (
                <li key={label}>{label}</li>
              ))}
            </ul>
            <label className="admin-field" style={{ display: "flex", gap: 8, alignItems: "flex-start", marginTop: 12 }}>
              <input
                type="checkbox"
                checked={readinessAck}
                onChange={(e) => setReadinessAck(e.target.checked)}
              />
              <span>Tôi xác nhận cho phép bắt đầu sản xuất khi hồ sơ chưa đầy đủ.</span>
            </label>
            <div className="quote-quick-contact-modal__actions">
              <button type="button" className="admin-btn admin-btn--secondary" onClick={() => setReadinessOpen(false)}>Quay lại</button>
              <button
                type="button"
                className="admin-btn admin-btn--primary"
                disabled={!readinessAck || busy}
                onClick={() => void updateStatus("IN_PRODUCTION", { productionReadinessAcknowledged: true })}
              >
                Bắt đầu sản xuất
              </button>
            </div>
          </div>
        </div>
      )}

      {shippedOpen && (
        <div className="quote-quick-contact-modal">
          <div className="quote-quick-contact-modal__backdrop" onClick={() => setShippedOpen(false)} />
          <div className="quote-quick-contact-modal__panel">
            <h3 className="quote-quick-contact-modal__title">
              {shippedRequiresExecution
                ? "Tạo chuyến giao hàng trước khi chuyển sang Đã giao hàng"
                : "Chưa đủ điều kiện chuyển sang Đã giao hàng"}
            </h3>
            <ul className="production-readiness-list">
              {shippedMissing.map((label) => <li key={label}>{label}</li>)}
            </ul>
            {shippedRequiresExecution && (
              <p className="admin-field-hint">
                Vui lòng tạo và xác nhận chuyến giao hàng trong mục THỰC HIỆN GIAO HÀNG, hoặc dùng xác nhận ngoại lệ bên dưới.
              </p>
            )}
            <label className="admin-field" style={{ display: "flex", gap: 8, alignItems: "flex-start", marginTop: 12 }}>
              <input type="checkbox" checked={shippedAck} onChange={(e) => setShippedAck(e.target.checked)} />
              <span>Tôi xác nhận chuyển trạng thái khi chưa có chuyến giao hàng.</span>
            </label>
            {shippedAck && (
              <div className="admin-field" style={{ marginTop: 12 }}>
                <label className="admin-label">Lý do xác nhận</label>
                <textarea className="admin-textarea" rows={3} required value={shippedReason} onChange={(e) => setShippedReason(e.target.value)} />
              </div>
            )}
            <div className="quote-quick-contact-modal__actions">
              <button type="button" className="admin-btn admin-btn--secondary" onClick={() => setShippedOpen(false)}>Quay lại</button>
              <button
                type="button"
                className="admin-btn admin-btn--primary"
                disabled={busy || !(shippedAck && shippedReason.trim())}
                onClick={() =>
                  void updateStatus("SHIPPED", {
                    shippedExecutionAcknowledged: true,
                    shippedOverrideReason: shippedReason,
                  })
                }
              >
                Chuyển sang Đã giao hàng
              </button>
            </div>
          </div>
        </div>
      )}

      {completionOpen && (
        <div className="quote-quick-contact-modal">
          <div className="quote-quick-contact-modal__backdrop" onClick={() => setCompletionOpen(false)} />
          <div className="quote-quick-contact-modal__panel">
            <h3 className="quote-quick-contact-modal__title">Đơn hàng chưa đủ điều kiện hoàn tất</h3>
            <ul className="production-readiness-list">
              {(completionData?.missingConditions ?? []).map((label) => <li key={label}>{label}</li>)}
            </ul>
            <label className="admin-field" style={{ display: "flex", gap: 8, alignItems: "flex-start", marginTop: 12 }}>
              <input type="checkbox" checked={completionAck} onChange={(e) => setCompletionAck(e.target.checked)} />
              <span>Tôi xác nhận hoàn tất đơn khi việc giao hàng chưa được xử lý đầy đủ.</span>
            </label>
            {completionAck && (
              <div className="admin-field" style={{ marginTop: 12 }}>
                <label className="admin-label">Lý do xác nhận</label>
                <textarea className="admin-textarea" rows={3} required value={completionReason} onChange={(e) => setCompletionReason(e.target.value)} />
              </div>
            )}
            <div className="quote-quick-contact-modal__actions">
              <button type="button" className="admin-btn admin-btn--secondary" onClick={() => setCompletionOpen(false)}>Quay lại</button>
              <button
                type="button"
                className="admin-btn admin-btn--primary"
                disabled={busy || !(completionAck && completionReason.trim())}
                onClick={() =>
                  void updateStatus("COMPLETED", {
                    completionReadinessAcknowledged: true,
                    completionOverrideReason: completionReason,
                  })
                }
              >
                Hoàn tất đơn hàng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
