import "server-only";

import type { DeliveryAttemptResult, DeliveryExecutionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  DELIVERY_ATTEMPT_RESULT_LABELS,
  DELIVERY_COMPLETION_STATE_LABELS,
  type DeliveryCompletionState,
} from "@/features/orders/delivery-execution-labels";
import {
  decimalToNumber,
  formatQuantityDisplay,
} from "@/features/orders/production-quantity-display";

export type DeliveryExecutionIndicators = {
  executionCount: number;
  progressLabel: string;
  latestAttemptResult: DeliveryAttemptResult | null;
  latestAttemptResultLabel: string | null;
  deliveredQuantity: number;
  expectedQuantity: number;
  hasProof: boolean;
  completionState: DeliveryCompletionState;
  completionStateLabel: string;
  canComplete: boolean;
};

function resolveCompletionState(input: {
  dispatched: number;
  delivered: number;
  expected: number;
  inProgress: boolean;
  hasUnresolved: boolean;
  canComplete: boolean;
}): DeliveryCompletionState {
  if (input.canComplete) return "CAN_COMPLETE";
  if (input.dispatched === 0) return "NOT_DISPATCHED";
  if (input.inProgress) return "IN_DELIVERY";
  if (input.hasUnresolved) return "HAS_RETURN_OR_DAMAGE";
  if (input.delivered > 0 && input.delivered < input.expected) return "PARTIAL";
  if (input.delivered >= input.expected && input.expected > 0) return "FULLY_DELIVERED";
  return "NEEDS_ATTENTION";
}

export async function batchGetDeliveryExecutionIndicators(
  orderIds: string[],
): Promise<Map<string, DeliveryExecutionIndicators>> {
  const map = new Map<string, DeliveryExecutionIndicators>();
  if (orderIds.length === 0) return map;

  const executions = await prisma.orderDeliveryExecution.findMany({
    where: { orderId: { in: orderIds }, status: { not: "CANCELLED" } },
    include: {
      proofs: { select: { id: true }, take: 1 },
      attempts: { orderBy: { attemptNumber: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "asc" },
  });

  const fulfillmentRows = await prisma.orderDeliveryExecutionItem.groupBy({
    by: ["deliveryExecutionId"],
    _sum: {
      dispatchedQuantity: true,
      deliveredQuantity: true,
      returnedQuantity: true,
      damagedQuantity: true,
    },
  });
  const fulfillmentByExecution = new Map(
    fulfillmentRows.map((r) => [r.deliveryExecutionId, r._sum]),
  );

  for (const orderId of orderIds) {
    const orderExecutions = executions.filter((e) => e.orderId === orderId);
    if (orderExecutions.length === 0) {
      map.set(orderId, {
        executionCount: 0,
        progressLabel: "Chưa xuất hàng",
        latestAttemptResult: null,
        latestAttemptResultLabel: null,
        deliveredQuantity: 0,
        expectedQuantity: 0,
        hasProof: false,
        completionState: "NOT_DISPATCHED",
        completionStateLabel: DELIVERY_COMPLETION_STATE_LABELS.NOT_DISPATCHED,
        canComplete: false,
      });
      continue;
    }

    let dispatched = 0;
    let delivered = 0;
    let returned = 0;
    let damaged = 0;
    let hasProof = false;
    let inProgress = false;
    let latestAttempt: DeliveryAttemptResult | null = null;

    for (const ex of orderExecutions) {
      const sums = fulfillmentByExecution.get(ex.id);
      dispatched += decimalToNumber(sums?.dispatchedQuantity);
      delivered += decimalToNumber(sums?.deliveredQuantity);
      returned += decimalToNumber(sums?.returnedQuantity);
      damaged += decimalToNumber(sums?.damagedQuantity);
      if (ex.proofs.length > 0) hasProof = true;
      if (["DRAFT", "READY_TO_DISPATCH", "DISPATCHED", "IN_TRANSIT"].includes(ex.status)) {
        inProgress = true;
      }
      if (ex.attempts[0]) latestAttempt = ex.attempts[0].result;
    }

    const expected = Math.max(dispatched, delivered);
    const canComplete =
      !inProgress &&
      delivered >= expected &&
      expected > 0 &&
      returned === 0 &&
      damaged === 0;

    const completionState = resolveCompletionState({
      dispatched,
      delivered,
      expected,
      inProgress,
      hasUnresolved: returned > 0 || damaged > 0,
      canComplete,
    });

    map.set(orderId, {
      executionCount: orderExecutions.length,
      progressLabel: `${formatQuantityDisplay(delivered)} / ${formatQuantityDisplay(expected || dispatched)}`,
      latestAttemptResult: latestAttempt,
      latestAttemptResultLabel: latestAttempt
        ? DELIVERY_ATTEMPT_RESULT_LABELS[latestAttempt]
        : null,
      deliveredQuantity: delivered,
      expectedQuantity: expected || dispatched,
      hasProof,
      completionState,
      completionStateLabel: DELIVERY_COMPLETION_STATE_LABELS[completionState],
      canComplete,
    });
  }

  return map;
}

export function matchesDeliveryExecutionFilter(
  indicators: DeliveryExecutionIndicators | undefined,
  filter: string | undefined,
): boolean {
  if (!filter) return true;
  if (!indicators) return false;
  switch (filter) {
    case "awaiting_dispatch":
      return indicators.completionState === "NOT_DISPATCHED";
    case "in_transit":
      return indicators.completionState === "IN_DELIVERY";
    case "partial":
      return indicators.completionState === "PARTIAL";
    case "failed":
      return indicators.latestAttemptResult === "FAILED" ||
        indicators.latestAttemptResult === "REFUSED" ||
        indicators.latestAttemptResult === "NO_RECIPIENT" ||
        indicators.latestAttemptResult === "WRONG_ADDRESS";
    case "fully_delivered":
      return indicators.completionState === "FULLY_DELIVERED";
    case "needs_completion":
      return indicators.canComplete;
    case "has_proof":
      return indicators.hasProof;
    case "missing_proof":
      return indicators.executionCount > 0 && !indicators.hasProof;
  }
  return true;
}
