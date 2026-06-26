"use client";

import type { OrderItemReadinessState } from "@/features/orders/order-item-readiness";

type Props = {
  state: OrderItemReadinessState;
  label: string;
};

const STATE_CLASS: Record<OrderItemReadinessState, string> = {
  MISSING_DOCS: "order-item-readiness--warning",
  AWAITING_PRODUCTION: "order-item-readiness--neutral",
  IN_PRODUCTION: "order-item-readiness--progress",
  AWAITING_QC: "order-item-readiness--qc",
  READY_TO_SHIP: "order-item-readiness--ready",
  NEEDS_ATTENTION: "order-item-readiness--danger",
};

export default function OrderItemReadinessBadge({ state, label }: Props) {
  return (
    <span className={`order-item-readiness-badge ${STATE_CLASS[state]}`}>
      {label}
    </span>
  );
}
