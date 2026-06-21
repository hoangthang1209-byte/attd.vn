"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import type { OrderStatus } from "@prisma/client";
import OrderStatusBadge from "@/components/admin/orders/OrderStatusBadge";
import {
  getAllowedOrderStatusTransitions,
  getOrderStatusCorrectionTargets,
  orderStatusActionLabel,
  orderStatusCorrectionLabel,
} from "@/features/orders/order-status";
import { ORDER_STATUS_LABELS } from "@/features/orders/order-labels";
import type { OrderDetailRecord, OrderListRecord } from "@/features/orders/order.types";
import { useAdminMutation } from "@/hooks/useAdminAction";
import { parseAdminJsonResponse } from "@/lib/admin/adminMutation";

const SHIPPED_DELIVERY_FALLBACK =
  "Vui lòng nhập đầy đủ thông tin giao hàng trước khi chuyển sang Đã giao hàng.";

type Props = {
  order: OrderListRecord;
  detailHref: string;
  onUpdated: (orderId: string, updated: OrderListRecord) => void;
};

function mapListRecordFromDetail(detail: OrderDetailRecord): OrderListRecord {
  return {
    id: detail.id,
    orderNo: detail.orderNo,
    sourceQuoteNo: detail.sourceQuoteNo,
    customerCompanyName: detail.customerCompanyName,
    contactName: detail.contactName,
    status: detail.status,
    totalAmount: detail.financials.totalAmount,
    paidAmount: detail.financials.paidAmount,
    outstandingAmount: detail.financials.outstandingAmount,
    overpaidAmount: detail.financials.overpaidAmount,
    paymentState: detail.financials.paymentState,
    createdAt: detail.createdAt,
  };
}

export default function OrderListQuickStatus({ order, detailHref, onUpdated }: Props) {
  const mutate = useAdminMutation();
  const popoverId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 });
  const [actionError, setActionError] = useState<string | null>(null);
  const [showDeliveryLink, setShowDeliveryLink] = useState(false);

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [correctionTarget, setCorrectionTarget] = useState<OrderStatus | null>(null);
  const [correctionReason, setCorrectionReason] = useState("");

  const canQuickUpdate = order.status !== "COMPLETED" && order.status !== "CANCELLED";
  const transitions = getAllowedOrderStatusTransitions(order.status);
  const correctionTargets = getOrderStatusCorrectionTargets(order.status);
  const forwardTransitions = transitions.filter((s) => s !== "CANCELLED");

  const updatePopoverPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const width = 260;
    const estimatedHeight = 240;
    const gap = 6;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openBelow = spaceBelow >= Math.min(estimatedHeight, 180) || spaceBelow >= rect.top;
    const top = openBelow ? rect.bottom + gap : Math.max(8, rect.top - estimatedHeight - gap);
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
    setPopoverPos({ top, left });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePopoverPosition();
    window.addEventListener("resize", updatePopoverPosition);
    window.addEventListener("scroll", updatePopoverPosition, true);
    return () => {
      window.removeEventListener("resize", updatePopoverPosition);
      window.removeEventListener("scroll", updatePopoverPosition, true);
    };
  }, [open, updatePopoverPosition]);

  const closePopover = useCallback(() => {
    if (pending) return;
    setOpen(false);
    setActionError(null);
    setShowDeliveryLink(false);
  }, [pending]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closePopover();
    }
    function onPointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (
        popoverRef.current?.contains(target) ||
        triggerRef.current?.contains(target)
      ) {
        return;
      }
      closePopover();
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [open, closePopover]);

  async function submitStatus(
    targetStatus: OrderStatus,
    options?: { cancelReason?: string; correctionReason?: string },
  ): Promise<OrderDetailRecord | null> {
    setPending(true);
    setActionError(null);
    setShowDeliveryLink(false);

    let failureMessage: string | null = null;

    const result = await mutate({
      loadingMessage: "Đang cập nhật trạng thái…",
      successMessage: "Đã cập nhật trạng thái đơn hàng.",
      action: async () => {
        const res = await fetch(`/api/orders/${order.id}/status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: targetStatus,
            cancelReason: options?.cancelReason ?? null,
            correctionReason: options?.correctionReason ?? null,
          }),
        });
        return parseAdminJsonResponse(res, (body) => body.order as OrderDetailRecord);
      },
      onSuccess: (detail) => {
        onUpdated(order.id, mapListRecordFromDetail(detail));
        setOpen(false);
        setCancelOpen(false);
        setCancelReason("");
        setCorrectionOpen(false);
        setCorrectionTarget(null);
        setCorrectionReason("");
        setActionError(null);
        setShowDeliveryLink(false);
      },
      onError: (message) => {
        failureMessage = message;
      },
    });

    setPending(false);

    if (!result && targetStatus === "SHIPPED") {
      const message = failureMessage ?? SHIPPED_DELIVERY_FALLBACK;
      setActionError(message);
      setShowDeliveryLink(true);
      setOpen(true);
    }

    return result;
  }

  async function handleForwardTransition(targetStatus: OrderStatus) {
    await submitStatus(targetStatus);
  }

  async function handleCancelSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!cancelReason.trim()) return;
    await submitStatus("CANCELLED", { cancelReason: cancelReason.trim() });
  }

  async function handleCorrectionSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!correctionTarget || !correctionReason.trim()) return;
    await submitStatus(correctionTarget, { correctionReason: correctionReason.trim() });
  }

  function openCancelModal() {
    setCancelReason("");
    setCancelOpen(true);
    setOpen(false);
  }

  function openCorrectionModal(target: OrderStatus) {
    setCorrectionTarget(target);
    setCorrectionReason("");
    setCorrectionOpen(true);
    setOpen(false);
  }

  if (!canQuickUpdate) {
    return <OrderStatusBadge status={order.status} />;
  }

  return (
    <>
      <div className="order-list-status-cell">
        <OrderStatusBadge status={order.status} />
        <button
          ref={triggerRef}
          type="button"
          className="order-list-status-update-btn"
          aria-expanded={open}
          aria-controls={popoverId}
          aria-label={`Cập nhật trạng thái đơn ${order.orderNo}`}
          disabled={pending}
          onClick={(e) => {
            e.stopPropagation();
            if (open) {
              closePopover();
            } else {
              setActionError(null);
              setShowDeliveryLink(false);
              setOpen(true);
            }
          }}
        >
          Cập nhật
        </button>
      </div>

      {open &&
        createPortal(
          <div
            ref={popoverRef}
            id={popoverId}
            className="order-list-status-popover"
            role="dialog"
            aria-label={`Cập nhật trạng thái ${order.orderNo}`}
            style={{ top: popoverPos.top, left: popoverPos.left }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="order-list-status-popover__current">
              Hiện tại: <strong>{ORDER_STATUS_LABELS[order.status]}</strong>
            </p>

            {actionError && (
              <div className="order-list-status-popover__error" role="alert">
                <p>{actionError}</p>
                {showDeliveryLink && (
                  <Link href={detailHref} className="order-list-status-popover__detail-link">
                    Mở chi tiết đơn hàng
                  </Link>
                )}
              </div>
            )}

            <div className="order-list-status-popover__actions">
              {forwardTransitions.map((targetStatus) => {
                const label = orderStatusActionLabel(targetStatus);
                if (!label) return null;
                return (
                  <button
                    key={targetStatus}
                    type="button"
                    className="admin-btn admin-btn--secondary admin-btn--small order-list-status-popover__action"
                    disabled={pending}
                    onClick={() => void handleForwardTransition(targetStatus)}
                  >
                    {label}
                  </button>
                );
              })}

              {transitions.includes("CANCELLED") && (
                <button
                  type="button"
                  className="admin-btn admin-btn--danger admin-btn--small order-list-status-popover__action"
                  disabled={pending}
                  onClick={openCancelModal}
                >
                  Hủy đơn
                </button>
              )}

              {correctionTargets.map((targetStatus) => (
                <button
                  key={`correction-${targetStatus}`}
                  type="button"
                  className="admin-btn admin-btn--secondary admin-btn--small order-list-status-popover__action"
                  disabled={pending}
                  onClick={() => openCorrectionModal(targetStatus)}
                >
                  {orderStatusCorrectionLabel(targetStatus)}
                </button>
              ))}
            </div>
          </div>,
          document.body,
        )}

      {cancelOpen &&
        createPortal(
          <div className="quote-quick-contact-modal order-list-status-modal">
            <div
              className="quote-quick-contact-modal__backdrop"
              onClick={() => {
                if (!pending) setCancelOpen(false);
              }}
              aria-hidden="true"
            />
            <form
              className="quote-quick-contact-modal__panel"
              onSubmit={(e) => void handleCancelSubmit(e)}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="quote-quick-contact-modal__title">Hủy đơn hàng</h3>
              <p className="admin-field-hint">
                Đơn: <strong>{order.orderNo}</strong>
              </p>
              <div className="admin-field">
                <label className="admin-label">
                  Lý do hủy đơn <span className="form-required">*</span>
                </label>
                <textarea
                  className="admin-textarea"
                  rows={3}
                  required
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  disabled={pending}
                />
              </div>
              <div className="quote-quick-contact-modal__actions">
                <button
                  type="button"
                  className="admin-btn admin-btn--secondary"
                  disabled={pending}
                  onClick={() => setCancelOpen(false)}
                >
                  Đóng
                </button>
                <button type="submit" className="admin-btn admin-btn--danger" disabled={pending || !cancelReason.trim()}>
                  Xác nhận hủy
                </button>
              </div>
            </form>
          </div>,
          document.body,
        )}

      {correctionOpen &&
        correctionTarget &&
        createPortal(
          <div className="quote-quick-contact-modal order-list-status-modal">
            <div
              className="quote-quick-contact-modal__backdrop"
              onClick={() => {
                if (!pending) setCorrectionOpen(false);
              }}
              aria-hidden="true"
            />
            <form
              className="quote-quick-contact-modal__panel"
              onSubmit={(e) => void handleCorrectionSubmit(e)}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="quote-quick-contact-modal__title">Điều chỉnh trạng thái</h3>
              <p className="admin-field-hint">
                Chuyển từ <strong>{ORDER_STATUS_LABELS[order.status]}</strong> sang{" "}
                <strong>{ORDER_STATUS_LABELS[correctionTarget]}</strong>
              </p>
              <div className="admin-field">
                <label className="admin-label">
                  Lý do điều chỉnh trạng thái <span className="form-required">*</span>
                </label>
                <textarea
                  className="admin-textarea"
                  rows={3}
                  required
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  disabled={pending}
                />
              </div>
              <div className="quote-quick-contact-modal__actions">
                <button
                  type="button"
                  className="admin-btn admin-btn--secondary"
                  disabled={pending}
                  onClick={() => setCorrectionOpen(false)}
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="admin-btn admin-btn--primary"
                  disabled={pending || !correctionReason.trim()}
                >
                  Xác nhận điều chỉnh
                </button>
              </div>
            </form>
          </div>,
          document.body,
        )}
    </>
  );
}
