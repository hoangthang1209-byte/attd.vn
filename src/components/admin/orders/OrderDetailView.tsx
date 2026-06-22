"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { OrderPaymentMethod, OrderPaymentType, OrderStatus } from "@prisma/client";
import AdminBackLink from "@/components/admin/AdminBackLink";
import OrderStatusBadge from "@/components/admin/orders/OrderStatusBadge";
import {
  formatOrderCurrency,
  formatOrderDate,
  formatOrderDateTime,
  toDateTimeLocalValue,
} from "@/features/orders/order-format";
import {
  getAllowedOrderStatusTransitions,
  getOrderStatusCorrectionTargets,
  isOrderEditable,
  orderCarrierDisplay,
  orderStatusActionLabel,
  orderStatusCorrectionLabel,
} from "@/features/orders/order-status";
import type { DeliveryCarrierRecord } from "@/features/delivery/delivery-carrier.service";
import ProductionOwnerSelect from "@/components/admin/orders/ProductionOwnerSelect";
import DeliveryCarrierSelect from "@/components/admin/orders/DeliveryCarrierSelect";
import {
  ORDER_PAYMENT_METHOD_LABELS,
  ORDER_PAYMENT_STATE_LABELS,
  ORDER_PAYMENT_STATUS_LABELS,
  ORDER_PAYMENT_TYPE_LABELS,
  ORDER_STATUS_LABELS,
} from "@/features/orders/order-labels";
import type { OrderDetailRecord } from "@/features/orders/order.types";
import type { EmployeeRecord } from "@/features/employees/employee.service";
import type { DeliveryMethodRecord } from "@/features/delivery/delivery-method.service";
import { toDateInputValue } from "@/features/quotes/format";
import { useAdminMutation } from "@/hooks/useAdminAction";
import { parseAdminJsonResponse } from "@/lib/admin/adminMutation";
import OrderDocumentActions from "@/components/admin/orders/OrderDocumentActions";
import OrderProductionPackSection from "@/components/admin/orders/OrderProductionPackSection";
import OrderProductionExecutionSection from "@/components/admin/orders/OrderProductionExecutionSection";
import type { ProductionReadinessResult } from "@/features/orders/production-readiness.service";
import type { HandoverReadinessResult } from "@/features/orders/handover-readiness.service";

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

function deliveryMethodDisplay(order: OrderDetailRecord): string {
  return order.deliveryMethodName ?? order.deliveryMethod ?? "—";
}

export default function OrderDetailView({ id }: Props) {
  const searchParams = useSearchParams();
  const mutate = useAdminMutation();
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
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({})) as {
            message?: string;
            code?: string;
            missingConditions?: string[];
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

  if (loading) return <p className="admin-loading">Đang tải...</p>;
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
  const canRecordPayment = order.status !== "COMPLETED" && order.status !== "CANCELLED";
  const canEditOrder = isOrderEditable(order.status);
  const showDeliveryForm = order.status !== "SHIPPED" && order.status !== "COMPLETED" && order.status !== "CANCELLED";

  return (
    <div className="admin-panel">
      <AdminBackLink href={listBackHref} />

      <div className="admin-section-header">
        <div>
          <p className="admin-crm-detail-code">{order.orderNo}</p>
          <h2>Đơn hàng {order.sourceQuoteNo ? `từ ${order.sourceQuoteNo}` : ""}</h2>
          <OrderStatusBadge status={order.status} />
          <p className="admin-field-hint">
            Tạo lúc {formatOrderDateTime(order.createdAt)}
            {order.sourceQuoteNo && order.quote && (
              <> · Báo giá nguồn: <Link href={`/admin/quotes/${order.quote.id}`}>{order.sourceQuoteNo}</Link></>
            )}
            {order.customer && (
              <> · Khách hàng: <Link href={`/admin/crm/customers/${order.customer.id}`}>{order.customer.name}</Link></>
            )}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {canEditOrder && (
            <Link href={`/admin/orders/${id}/edit`} className="admin-btn admin-btn--secondary">
              Chỉnh sửa đơn hàng
            </Link>
          )}
        </div>
      </div>

      <OrderDocumentActions order={order} />

      <fieldset className="admin-catalog-fieldset" style={{ marginTop: 16 }}>
        <legend>Cập nhật trạng thái</legend>
        <p className="admin-field-hint" style={{ marginBottom: 12 }}>
          Trạng thái hiện tại: <strong>{ORDER_STATUS_LABELS[order.status]}</strong>
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {transitions.filter((s) => s !== "CANCELLED").map((status) => {
            const label = orderStatusActionLabel(status);
            if (!label) return null;
            return (
              <button
                key={status}
                type="button"
                className="admin-btn admin-btn--primary"
                disabled={busy}
                onClick={() => void requestStatusChange(status)}
              >
                {label}
              </button>
            );
          })}
          {transitions.includes("CANCELLED") && (
            <button type="button" className="admin-btn admin-btn--secondary" disabled={busy} onClick={() => setCancelOpen(true)}>
              Hủy đơn
            </button>
          )}
          {correctionTargets.map((status) => (
            <button
              key={`correction-${status}`}
              type="button"
              className="admin-btn admin-btn--secondary admin-btn--small"
              disabled={busy}
              onClick={() => {
                setCorrectionStatus(status);
                setCorrectionReason("");
                setCorrectionOpen(true);
              }}
            >
              {orderStatusCorrectionLabel(status)}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="admin-catalog-kpi-bar">
        <div className="admin-catalog-kpi">
          <strong>{formatOrderCurrency(order.financials.totalAmount, order.currency)}</strong>
          <span>Tổng giá trị</span>
        </div>
        <div className="admin-catalog-kpi admin-catalog-kpi--ok">
          <strong>{formatOrderCurrency(order.financials.paidAmount, order.currency)}</strong>
          <span>Đã thanh toán</span>
        </div>
        <div className="admin-catalog-kpi">
          <strong>{formatOrderCurrency(order.financials.outstandingAmount, order.currency)}</strong>
          <span>Còn phải thu</span>
        </div>
        <div className="admin-catalog-kpi">
          <strong>{ORDER_PAYMENT_STATE_LABELS[order.financials.paymentState]}</strong>
          <span>Trạng thái thanh toán</span>
        </div>
        {order.financials.overpaidAmount > 0 && (
          <div className="admin-catalog-kpi">
            <strong>{formatOrderCurrency(order.financials.overpaidAmount, order.currency)}</strong>
            <span>Thanh toán vượt</span>
          </div>
        )}
      </div>

      <fieldset className="admin-catalog-fieldset" style={{ marginTop: 16 }}>
        <legend>TIẾN ĐỘ SẢN XUẤT</legend>
        <div className="admin-field-hint" style={{ marginBottom: 12 }}>
          <p>Trạng thái đơn hàng: <strong>{ORDER_STATUS_LABELS[order.status]}</strong></p>
          {order.productionStartedAt && <p>Ngày bắt đầu sản xuất: {formatOrderDateTime(order.productionStartedAt)}</p>}
          {order.readyToShipAt && <p>Ngày sẵn sàng giao: {formatOrderDateTime(order.readyToShipAt)}</p>}
        </div>
        {canEditOrder ? (
          <form onSubmit={(e) => void saveProduction(e)}>
            <div className="admin-catalog-variant-fields">
              <div className="admin-field">
                <label className="admin-label">Người phụ trách sản xuất</label>
                <ProductionOwnerSelect
                  value={productionFields.productionOwnerId}
                  onChange={(productionOwnerId) =>
                    setProductionFields((f) => ({ ...f, productionOwnerId }))
                  }
                  employees={productionEmployees}
                  onEmployeesChange={setProductionEmployees}
                  legacyOwnerName={
                    !order.productionOwnerId && order.productionOwnerName
                      ? order.productionOwnerName
                      : null
                  }
                  disabled={busy}
                  onEmployeeCreated={(employee) => {
                    void saveProductionInternal({ productionOwnerId: employee.id });
                  }}
                />
              </div>
              <div className="admin-field">
                <label className="admin-label">Hạn hoàn thành dự kiến</label>
                <input
                  className="admin-input"
                  type="date"
                  value={productionFields.productionDueDate}
                  onChange={(e) => setProductionFields((f) => ({ ...f, productionDueDate: e.target.value }))}
                />
              </div>
              <div className="admin-field" style={{ gridColumn: "1 / -1" }}>
                <label className="admin-label">Ghi chú sản xuất</label>
                <textarea
                  className="admin-textarea"
                  rows={3}
                  value={productionFields.productionNote}
                  onChange={(e) => setProductionFields((f) => ({ ...f, productionNote: e.target.value }))}
                />
              </div>
            </div>
            <button type="submit" className="admin-btn admin-btn--primary admin-btn--small" disabled={busy}>
              Lưu thông tin sản xuất
            </button>
          </form>
        ) : (
          <>
            <p className="admin-field-hint">Phụ trách: {order.productionOwnerName ?? "—"}</p>
            <p className="admin-field-hint">Hạn hoàn thành: {order.productionDueDate ? formatOrderDate(order.productionDueDate) : "—"}</p>
            {order.productionNote && <pre className="admin-field-hint" style={{ whiteSpace: "pre-wrap" }}>{order.productionNote}</pre>}
          </>
        )}
      </fieldset>

      <OrderProductionPackSection orderId={id} order={order} onOrderChange={setOrder} />
      <OrderProductionExecutionSection orderId={id} order={order} />

      <fieldset className="admin-catalog-fieldset" style={{ marginTop: 16 }}>
        <legend>GIAO HÀNG</legend>
        {showDeliveryForm && canEditOrder ? (
          <form onSubmit={(e) => void saveDelivery(e)}>
            <div className="admin-catalog-variant-fields">
              <div className="admin-field">
                <label className="admin-label">Hình thức giao hàng</label>
                <select
                  className="admin-input"
                  value={deliveryFields.deliveryMethodId}
                  onChange={(e) => setDeliveryFields((f) => ({ ...f, deliveryMethodId: e.target.value }))}
                >
                  <option value="">— Chọn hình thức —</option>
                  {deliveryMethods.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                  {order.deliveryMethodId &&
                    !deliveryMethods.some((m) => m.id === order.deliveryMethodId) &&
                    deliveryMethodDisplay(order) !== "—" && (
                      <option value={order.deliveryMethodId}>
                        {deliveryMethodDisplay(order)} (lưu trước)
                      </option>
                    )}
                </select>
              </div>
              <div className="admin-field">
                <label className="admin-label">Người phụ trách giao hàng</label>
                <select
                  className="admin-input"
                  value={deliveryFields.deliveryOwnerId}
                  onChange={(e) => setDeliveryFields((f) => ({ ...f, deliveryOwnerId: e.target.value }))}
                >
                  <option value="">— Chọn nhân viên —</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName} ({emp.employeeCode})
                    </option>
                  ))}
                  {order.deliveryOwnerId &&
                    !employees.some((e) => e.id === order.deliveryOwnerId) &&
                    order.deliveryOwnerName && (
                      <option value={order.deliveryOwnerId}>
                        {order.deliveryOwnerName} (lưu trước)
                      </option>
                    )}
                </select>
              </div>
              <div className="admin-field">
                <label className="admin-label">Đơn vị vận chuyển</label>
                <DeliveryCarrierSelect
                  value={deliveryFields.deliveryCarrierId}
                  onChange={(deliveryCarrierId) =>
                    setDeliveryFields((f) => ({ ...f, deliveryCarrierId }))
                  }
                  carriers={carriers}
                  onCarriersChange={setCarriers}
                  legacyCarrierName={
                    !order.deliveryCarrierId ? orderCarrierDisplay(order) : null
                  }
                  disabled={busy}
                  onCarrierCreated={(carrier) => {
                    void saveDeliveryInternal({ deliveryCarrierId: carrier.id });
                  }}
                />
              </div>
              <div className="admin-field">
                <label className="admin-label">Mã vận đơn</label>
                <input className="admin-input" value={deliveryFields.deliveryTrackingCode} onChange={(e) => setDeliveryFields((f) => ({ ...f, deliveryTrackingCode: e.target.value }))} />
              </div>
              <div className="admin-field">
                <label className="admin-label">Người nhận *</label>
                <input className="admin-input" required value={deliveryFields.deliveryRecipientName} onChange={(e) => setDeliveryFields((f) => ({ ...f, deliveryRecipientName: e.target.value }))} />
              </div>
              <div className="admin-field">
                <label className="admin-label">Số điện thoại người nhận *</label>
                <input className="admin-input" required value={deliveryFields.deliveryRecipientPhone} onChange={(e) => setDeliveryFields((f) => ({ ...f, deliveryRecipientPhone: e.target.value }))} />
              </div>
              <div className="admin-field" style={{ gridColumn: "1 / -1" }}>
                <label className="admin-label">Địa chỉ giao hàng *</label>
                <textarea className="admin-textarea" rows={2} required value={deliveryFields.deliveryAddress} onChange={(e) => setDeliveryFields((f) => ({ ...f, deliveryAddress: e.target.value }))} />
              </div>
              <div className="admin-field">
                <label className="admin-label">Dự kiến giao</label>
                <input className="admin-input" type="date" value={deliveryFields.deliveryExpectedAt} onChange={(e) => setDeliveryFields((f) => ({ ...f, deliveryExpectedAt: e.target.value }))} />
              </div>
              <div className="admin-field" style={{ gridColumn: "1 / -1" }}>
                <label className="admin-label">Ghi chú giao hàng</label>
                <textarea className="admin-textarea" rows={2} value={deliveryFields.deliveryNote} onChange={(e) => setDeliveryFields((f) => ({ ...f, deliveryNote: e.target.value }))} />
              </div>
            </div>
            <button type="submit" className="admin-btn admin-btn--primary admin-btn--small" disabled={busy}>
              Lưu thông tin giao hàng
            </button>
          </form>
        ) : (
          <>
            <p className="admin-field-hint">Hình thức: {deliveryMethodDisplay(order)}</p>
            {order.deliveryOwnerName && (
              <p className="admin-field-hint">Phụ trách giao: {order.deliveryOwnerName}</p>
            )}
            <p className="admin-field-hint">Đơn vị vận chuyển: {orderCarrierDisplay(order) ?? "—"}</p>
            <p className="admin-field-hint">Mã vận đơn: {order.deliveryTrackingCode ?? "—"}</p>
            <p className="admin-field-hint">Người nhận: {order.deliveryRecipientName ?? "—"}</p>
            <p className="admin-field-hint">SĐT: {order.deliveryRecipientPhone ?? "—"}</p>
            <p className="admin-field-hint">Địa chỉ: {order.deliveryAddress ?? "—"}</p>
            <p className="admin-field-hint">Dự kiến giao: {order.deliveryExpectedAt ? formatOrderDate(order.deliveryExpectedAt) : "—"}</p>
            <p className="admin-field-hint">Ngày bàn giao vận chuyển: {order.shippedAt ? formatOrderDateTime(order.shippedAt) : "—"}</p>
            {order.deliveryNote && <pre className="admin-field-hint" style={{ whiteSpace: "pre-wrap" }}>{order.deliveryNote}</pre>}
          </>
        )}
      </fieldset>

      <div className="quote-form__party-grid" style={{ marginTop: 16 }}>
        <fieldset className="quote-form__party-col admin-catalog-fieldset">
          <legend>Thông tin khách hàng</legend>
          <p>{order.customerCompanyName ?? "—"}</p>
          {order.customerCode && <p className="admin-field-hint">Mã: {order.customerCode}</p>}
          {order.customerTaxCode && <p className="admin-field-hint">MST: {order.customerTaxCode}</p>}
          {order.customerAddress && <p className="admin-field-hint">{order.customerAddress}</p>}
          {order.contactName && <p className="admin-field-hint">Liên hệ: {order.contactName}{order.contactTitle ? ` · ${order.contactTitle}` : ""}</p>}
          {order.contactPhone && <p className="admin-field-hint">SĐT: {order.contactPhone}</p>}
          {order.contactEmail && <p className="admin-field-hint">Email: {order.contactEmail}</p>}
        </fieldset>

        <fieldset className="quote-form__party-col admin-catalog-fieldset">
          <legend>Thông tin đơn hàng</legend>
          <p className="admin-field-hint">Ngày đơn: {formatOrderDate(order.orderDate)}</p>
          {order.sourceQuoteDate && <p className="admin-field-hint">Ngày báo giá: {formatOrderDate(order.sourceQuoteDate)}</p>}
          {order.salesName && <p className="admin-field-hint">Tư vấn: {order.salesName}{order.salesTitle ? ` · ${order.salesTitle}` : ""}</p>}
          {order.sampleFee != null && order.sampleFee > 0 && (
            <p className="admin-field-hint">Phí mẫu: {formatOrderCurrency(order.sampleFee, order.currency)}</p>
          )}
          {order.sampleLeadTime && <p className="admin-field-hint">Thời gian làm mẫu: {order.sampleLeadTime}</p>}
          {order.sampleRefundCondition && (
            <pre className="admin-field-hint" style={{ whiteSpace: "pre-wrap" }}>{order.sampleRefundCondition}</pre>
          )}
        </fieldset>
      </div>

      {order.terms && (
        <fieldset className="admin-catalog-fieldset" style={{ marginTop: 16 }}>
          <legend>Điều khoản đơn hàng</legend>
          <pre className="admin-field-hint" style={{ whiteSpace: "pre-wrap" }}>{order.terms}</pre>
        </fieldset>
      )}

      <fieldset className="admin-catalog-fieldset" style={{ marginTop: 16 }}>
        <legend>Sản phẩm đặt hàng</legend>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Sản phẩm</th>
                <th>SKU</th>
                <th>Màu</th>
                <th>SL</th>
                <th>Đơn giá</th>
                <th>Thành tiền</th>
                <th>Thời gian SX</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <Fragment key={item.id}>
                  <tr>
                    <td>
                      {[item.productNameSnapshot, item.variantNameSnapshot].filter(Boolean).join(" · ") || "—"}
                      {item.description && <div className="admin-field-hint">{item.description}</div>}
                      {item.itemNote && <div className="admin-field-hint">Ghi chú: {item.itemNote}</div>}
                    </td>
                    <td>{item.skuSnapshot ?? "—"}</td>
                    <td>{item.colorSnapshot ?? "—"}</td>
                    <td>{item.quantity} {item.unit}</td>
                    <td>{formatOrderCurrency(item.unitPrice, order.currency)}</td>
                    <td>{formatOrderCurrency(item.lineTotal, order.currency)}</td>
                    <td>{item.productionLeadTime ?? "—"}</td>
                  </tr>
                  {item.variants.length > 0 && (
                    <tr key={`${item.id}-variants`}>
                      <td colSpan={7} style={{ paddingTop: 0 }}>
                        <div className="admin-table-wrap">
                          <table className="admin-table admin-table--compact">
                            <thead>
                              <tr>
                                <th>Màu sắc</th>
                                <th>Size</th>
                                <th>SKU</th>
                                <th>Số lượng</th>
                                <th>Đơn vị</th>
                              </tr>
                            </thead>
                            <tbody>
                              {item.variants.map((variant) => (
                                <tr key={variant.id}>
                                  <td>{variant.colorNameSnapshot ?? "—"}</td>
                                  <td>{variant.sizeValue ?? "—"}</td>
                                  <td>{variant.skuSnapshot ?? "—"}</td>
                                  <td>{variant.quantity}</td>
                                  <td>{variant.unit}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </fieldset>

      <fieldset className="admin-catalog-fieldset" style={{ marginTop: 16 }}>
        <legend>Thanh toán</legend>
        {canRecordPayment && (
          <button type="button" className="admin-btn admin-btn--primary admin-btn--small" style={{ marginBottom: 12 }} onClick={() => setPaymentOpen(true)}>
            Ghi nhận thanh toán
          </button>
        )}
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Ngày</th>
                <th>Loại</th>
                <th>Phương thức</th>
                <th>Mã tham chiếu</th>
                <th>Ghi chú</th>
                <th>Số tiền</th>
                <th>Trạng thái</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {order.payments.length === 0 ? (
                <tr><td colSpan={8}>Chưa có ghi nhận thanh toán</td></tr>
              ) : order.payments.map((p) => (
                <tr key={p.id}>
                  <td>{formatOrderDateTime(p.paidAt)}</td>
                  <td>{ORDER_PAYMENT_TYPE_LABELS[p.type]}</td>
                  <td>{ORDER_PAYMENT_METHOD_LABELS[p.method]}</td>
                  <td>{p.referenceCode ?? "—"}</td>
                  <td>{p.note ?? "—"}</td>
                  <td>{formatOrderCurrency(p.amount, order.currency)}</td>
                  <td>{ORDER_PAYMENT_STATUS_LABELS[p.status]}</td>
                  <td>
                    {p.status === "CONFIRMED" && canRecordPayment ? (
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" disabled={busy} onClick={() => openEditPayment(p.id)}>
                          Chỉnh sửa
                        </button>
                        <button type="button" className="admin-btn admin-btn--secondary admin-btn--xs" disabled={busy} onClick={() => openVoidPayment(p.id)}>
                          Hủy ghi nhận
                        </button>
                      </div>
                    ) : p.status === "VOID" ? (
                      <span className="admin-field-hint">Đã hủy</span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </fieldset>

      <fieldset className="admin-catalog-fieldset" style={{ marginTop: 16 }}>
        <legend>Nhật ký đơn hàng</legend>
        {order.activities.length === 0 ? (
          <p className="admin-field-hint">Chưa có hoạt động</p>
        ) : (
          <ul className="order-activity-timeline">
            {order.activities.map((activity) => (
              <li key={activity.id}>
                <strong>{activity.title}</strong>
                <span className="admin-field-hint"> · {formatOrderDateTime(activity.createdAt)}</span>
                {activity.detail && <p className="admin-field-hint">{activity.detail}</p>}
              </li>
            ))}
          </ul>
        )}
      </fieldset>

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
    </div>
  );
}
