import type { DeliveryExecutionStatus } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { prisma } from "@/lib/prisma";
import { resolveOrderItemTotalQuantity } from "@/features/orders/bom-calculations";
import {
  DELIVERY_COMPLETION_STATE_LABELS,
  type DeliveryCompletionState,
} from "@/features/orders/delivery-execution-labels";
import { getQcInspection } from "@/features/orders/qc-inspection.service";
import {
  formatQuantityDisplay,
  ProductionExecutionValidationError,
  serializeDecimal,
  ShippedValidationError,
  CompletionValidationError,
} from "@/features/orders/production-quantity";

const ACTIVE_EXECUTION_STATUSES: DeliveryExecutionStatus[] = [
  "DRAFT",
  "READY_TO_DISPATCH",
  "DISPATCHED",
  "IN_TRANSIT",
  "PARTIALLY_DELIVERED",
  "DELIVERED",
  "DELIVERY_FAILED",
  "RETURNING",
  "RETURNED",
];

export type DeliveryFulfillmentLine = {
  orderItemId: string;
  orderItemVariantId: string | null;
  productName: string;
  colorName: string | null;
  sizeValue: string | null;
  sku: string | null;
  unit: string;
  orderedQuantity: string;
  qcPassedQuantity: string | null;
  totalDispatchedQuantity: string;
  totalDeliveredQuantity: string;
  totalReturnedQuantity: string;
  totalDamagedQuantity: string;
  remainingDispatchableQuantity: string;
  remainingDeliverableQuantity: string;
};

export type DeliveryFulfillmentSummary = {
  orderedQuantity: string;
  qcPassedQuantity: string | null;
  totalDispatchedQuantity: string;
  totalDeliveredQuantity: string;
  totalReturnedQuantity: string;
  totalDamagedQuantity: string;
  remainingDispatchableQuantity: string;
  remainingUndeliveredQuantity: string;
  executionCount: number;
  lines: DeliveryFulfillmentLine[];
};

export type CompletionReadinessResult = {
  state: DeliveryCompletionState;
  stateLabel: string;
  isReady: boolean;
  missingConditions: string[];
  summary: DeliveryFulfillmentSummary;
  executionCount: number;
  successfulExecutionCount: number;
  executionsMissingProof: string[];
  unresolvedReturnedQuantity: string;
  unresolvedDamagedQuantity: string;
  inProgressExecutionCodes: string[];
};

function lineKey(orderItemId: string, orderItemVariantId: string | null): string {
  return `${orderItemId}:${orderItemVariantId ?? ""}`;
}

function sumDecimal(values: Decimal[]): Decimal {
  return values.reduce((acc, v) => acc.plus(v), new Decimal(0));
}

function qtyFromDecimal(value: Decimal | null | undefined): Decimal {
  return value ?? new Decimal(0);
}

function resolveOrderLevelQcPassed(qcPassed: string | null, qcStatus: string | null): number | null {
  if (!qcStatus || qcStatus === "DRAFT") return null;
  if (qcStatus !== "PASSED" && qcStatus !== "PASSED_WITH_NOTE") return null;
  const n = Number(qcPassed ?? 0);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function allocateQcToLine(orderedQty: number, orderTotal: number, qcPassed: number | null): number | null {
  if (qcPassed === null) return null;
  if (orderTotal <= 0) return null;
  if (qcPassed >= orderTotal) return orderedQty;
  return (orderedQty / orderTotal) * qcPassed;
}

export async function getDeliveryFulfillment(orderId: string): Promise<DeliveryFulfillmentSummary> {
  const [order, executions, qc] = await Promise.all([
    prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          orderBy: { sortOrder: "asc" },
          include: { variants: { orderBy: { sortOrder: "asc" } } },
        },
      },
    }),
    prisma.orderDeliveryExecution.findMany({
      where: {
        orderId,
        status: { not: "CANCELLED" },
      },
      include: { items: true },
    }),
    getQcInspection(orderId),
  ]);

  if (!order) {
    throw new ProductionExecutionValidationError("Không tìm thấy đơn hàng.");
  }

  const orderTotal = order.items.reduce((sum, item) => sum + resolveOrderItemTotalQuantity(item), 0);
  const orderQcPassed = resolveOrderLevelQcPassed(qc?.passedQuantity ?? null, qc?.status ?? null);

  const agg = new Map<
    string,
    {
      orderItemId: string;
      orderItemVariantId: string | null;
      productName: string;
      colorName: string | null;
      sizeValue: string | null;
      sku: string | null;
      unit: string;
      orderedQuantity: Decimal;
      qcPassedQuantity: Decimal | null;
      dispatched: Decimal;
      delivered: Decimal;
      returned: Decimal;
      damaged: Decimal;
    }
  >();

  for (const item of order.items) {
    if (item.variants.length > 0) {
      for (const variant of item.variants) {
        const ordered = new Decimal(variant.quantity);
        const qcLine = allocateQcToLine(variant.quantity, orderTotal, orderQcPassed);
        agg.set(lineKey(item.id, variant.id), {
          orderItemId: item.id,
          orderItemVariantId: variant.id,
          productName: item.productNameSnapshot ?? item.variantNameSnapshot ?? "Sản phẩm",
          colorName: variant.colorNameSnapshot,
          sizeValue: variant.sizeValue,
          sku: variant.skuSnapshot ?? item.skuSnapshot,
          unit: variant.unit ?? item.unit,
          orderedQuantity: ordered,
          qcPassedQuantity: qcLine === null ? null : new Decimal(qcLine),
          dispatched: new Decimal(0),
          delivered: new Decimal(0),
          returned: new Decimal(0),
          damaged: new Decimal(0),
        });
      }
    } else {
      const ordered = new Decimal(item.quantity);
      const qcLine = allocateQcToLine(item.quantity, orderTotal, orderQcPassed);
      agg.set(lineKey(item.id, null), {
        orderItemId: item.id,
        orderItemVariantId: null,
        productName: item.productNameSnapshot ?? item.variantNameSnapshot ?? "Sản phẩm",
        colorName: item.colorSnapshot,
        sizeValue: null,
        sku: item.skuSnapshot,
        unit: item.unit,
        orderedQuantity: ordered,
        qcPassedQuantity: qcLine === null ? null : new Decimal(qcLine),
        dispatched: new Decimal(0),
        delivered: new Decimal(0),
        returned: new Decimal(0),
        damaged: new Decimal(0),
      });
    }
  }

  for (const execution of executions) {
    for (const row of execution.items) {
      const key = lineKey(row.orderItemId ?? "", row.orderItemVariantId);
      const existing = agg.get(key);
      if (!existing) continue;
      existing.dispatched = existing.dispatched.plus(qtyFromDecimal(row.dispatchedQuantity));
      existing.delivered = existing.delivered.plus(qtyFromDecimal(row.deliveredQuantity));
      existing.returned = existing.returned.plus(qtyFromDecimal(row.returnedQuantity));
      existing.damaged = existing.damaged.plus(qtyFromDecimal(row.damagedQuantity));
    }
  }

  const lines: DeliveryFulfillmentLine[] = [...agg.values()].map((row) => {
    const expected = row.qcPassedQuantity ?? row.orderedQuantity;
    const remainingDispatch = Decimal.max(expected.minus(row.dispatched), 0);
    const remainingDeliver = Decimal.max(row.dispatched.minus(row.delivered), 0);
    return {
      orderItemId: row.orderItemId,
      orderItemVariantId: row.orderItemVariantId,
      productName: row.productName,
      colorName: row.colorName,
      sizeValue: row.sizeValue,
      sku: row.sku,
      unit: row.unit,
      orderedQuantity: serializeDecimal(row.orderedQuantity),
      qcPassedQuantity: row.qcPassedQuantity ? serializeDecimal(row.qcPassedQuantity) : null,
      totalDispatchedQuantity: serializeDecimal(row.dispatched),
      totalDeliveredQuantity: serializeDecimal(row.delivered),
      totalReturnedQuantity: serializeDecimal(row.returned),
      totalDamagedQuantity: serializeDecimal(row.damaged),
      remainingDispatchableQuantity: serializeDecimal(remainingDispatch),
      remainingDeliverableQuantity: serializeDecimal(remainingDeliver),
    };
  });

  const orderedTotal = sumDecimal([...agg.values()].map((r) => r.orderedQuantity));
  const qcTotal =
    orderQcPassed !== null ? new Decimal(orderQcPassed) : null;
  const dispatchedTotal = sumDecimal([...agg.values()].map((r) => r.dispatched));
  const deliveredTotal = sumDecimal([...agg.values()].map((r) => r.delivered));
  const returnedTotal = sumDecimal([...agg.values()].map((r) => r.returned));
  const damagedTotal = sumDecimal([...agg.values()].map((r) => r.damaged));
  const expectedTotal = qcTotal ?? orderedTotal;

  return {
    orderedQuantity: serializeDecimal(orderedTotal),
    qcPassedQuantity: qcTotal ? serializeDecimal(qcTotal) : null,
    totalDispatchedQuantity: serializeDecimal(dispatchedTotal),
    totalDeliveredQuantity: serializeDecimal(deliveredTotal),
    totalReturnedQuantity: serializeDecimal(returnedTotal),
    totalDamagedQuantity: serializeDecimal(damagedTotal),
    remainingDispatchableQuantity: serializeDecimal(
      Decimal.max(expectedTotal.minus(dispatchedTotal), 0),
    ),
    remainingUndeliveredQuantity: serializeDecimal(
      Decimal.max(expectedTotal.minus(deliveredTotal), 0),
    ),
    executionCount: executions.length,
    lines,
  };
}

export function isLegacyOrderForDeliveryExecution(input: {
  status: string;
  executionCount: number;
}): boolean {
  if (input.executionCount > 0) return false;
  return input.status === "SHIPPED" || input.status === "COMPLETED";
}

export async function evaluateCompletionReadiness(orderId: string): Promise<CompletionReadinessResult> {
  const [order, executions, fulfillment] = await Promise.all([
    prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, status: true },
    }),
    prisma.orderDeliveryExecution.findMany({
      where: { orderId },
      include: {
        deliveryMethod: { select: { requiresProofOfDelivery: true, name: true } },
        proofs: { select: { id: true } },
        attempts: { orderBy: { attemptNumber: "desc" }, take: 1 },
      },
      orderBy: { createdAt: "asc" },
    }),
    getDeliveryFulfillment(orderId),
  ]);

  if (!order) {
    throw new ProductionExecutionValidationError("Không tìm thấy đơn hàng.");
  }

  if (isLegacyOrderForDeliveryExecution({
    status: order.status,
    executionCount: executions.length,
  })) {
    return {
      state: "CAN_COMPLETE",
      stateLabel: DELIVERY_COMPLETION_STATE_LABELS.CAN_COMPLETE,
      isReady: true,
      missingConditions: [],
      summary: fulfillment,
      executionCount: 0,
      successfulExecutionCount: 0,
      executionsMissingProof: [],
      unresolvedReturnedQuantity: "0",
      unresolvedDamagedQuantity: "0",
      inProgressExecutionCodes: [],
    };
  }

  const missingConditions: string[] = [];
  const inProgressExecutionCodes: string[] = [];
  const executionsMissingProof: string[] = [];

  const remainingUndelivered = Number(fulfillment.remainingUndeliveredQuantity);
  if (remainingUndelivered > 0) {
    missingConditions.push(`Còn ${formatQuantityDisplay(remainingUndelivered)} sản phẩm chưa giao thành công.`);
  }

  const remainingDispatchable = Number(fulfillment.remainingDispatchableQuantity);
  if (remainingDispatchable > 0) {
    missingConditions.push(`Còn ${formatQuantityDisplay(remainingDispatchable)} sản phẩm chưa xuất hàng.`);
  }

  const returned = Number(fulfillment.totalReturnedQuantity);
  const damaged = Number(fulfillment.totalDamagedQuantity);
  if (returned > 0) {
    missingConditions.push(`Có ${formatQuantityDisplay(returned)} sản phẩm hoàn hàng chưa được xử lý.`);
  }
  if (damaged > 0) {
    missingConditions.push(`Có ${formatQuantityDisplay(damaged)} sản phẩm hư hỏng chưa được xử lý.`);
  }

  for (const execution of executions) {
    if (execution.status === "CANCELLED") continue;
    if (["DRAFT", "READY_TO_DISPATCH", "IN_TRANSIT"].includes(execution.status)) {
      inProgressExecutionCodes.push(execution.executionCode);
      missingConditions.push(`Chuyến ${execution.executionCode} vẫn đang giao hoặc chưa xuất.`);
    }
    const isSuccessful =
      execution.status === "DELIVERED" ||
      execution.status === "PARTIALLY_DELIVERED" ||
      execution.attempts[0]?.result === "DELIVERED" ||
      execution.attempts[0]?.result === "PARTIAL";
    if (
      isSuccessful &&
      execution.deliveryMethod?.requiresProofOfDelivery &&
      execution.proofs.length === 0
    ) {
      executionsMissingProof.push(execution.executionCode);
      missingConditions.push(`Chuyến ${execution.executionCode} chưa có bằng chứng giao hàng.`);
    }
  }

  const successfulExecutionCount = executions.filter(
    (e) => e.status === "DELIVERED" || e.status === "PARTIALLY_DELIVERED",
  ).length;

  let state: DeliveryCompletionState;
  if (missingConditions.length === 0) {
    state = "CAN_COMPLETE";
  } else if (Number(fulfillment.totalDispatchedQuantity) === 0) {
    state = "NOT_DISPATCHED";
  } else if (inProgressExecutionCodes.length > 0) {
    state = "IN_DELIVERY";
  } else if (remainingUndelivered > 0 && Number(fulfillment.totalDeliveredQuantity) > 0) {
    state = "PARTIAL";
  } else if (returned > 0 || damaged > 0) {
    state = "HAS_RETURN_OR_DAMAGE";
  } else if (remainingUndelivered === 0 && missingConditions.length === 0) {
    state = "FULLY_DELIVERED";
  } else {
    state = "NEEDS_ATTENTION";
  }

  return {
    state,
    stateLabel: DELIVERY_COMPLETION_STATE_LABELS[state],
    isReady: missingConditions.length === 0,
    missingConditions,
    summary: fulfillment,
    executionCount: executions.filter((e) => e.status !== "CANCELLED").length,
    successfulExecutionCount,
    executionsMissingProof,
    unresolvedReturnedQuantity: fulfillment.totalReturnedQuantity,
    unresolvedDamagedQuantity: fulfillment.totalDamagedQuantity,
    inProgressExecutionCodes,
  };
}

export async function assertShippedTransition(
  orderId: string,
  input: {
    shippedExecutionAcknowledged?: boolean;
    shippedOverrideReason?: string | null;
  },
): Promise<void> {
  const [order, executions] = await Promise.all([
    prisma.order.findUnique({ where: { id: orderId }, select: { status: true } }),
    prisma.orderDeliveryExecution.findMany({
      where: { orderId, status: { in: ["DISPATCHED", "IN_TRANSIT"] } },
      select: { executionCode: true },
    }),
  ]);

  if (!order) throw new ProductionExecutionValidationError("Không tìm thấy đơn hàng.");

  if (isLegacyOrderForDeliveryExecution({
    status: order.status,
    executionCount: await prisma.orderDeliveryExecution.count({ where: { orderId } }),
  }) && order.status !== "READY_TO_SHIP") {
    return;
  }

  if (executions.length > 0) return;

  if (!input.shippedExecutionAcknowledged) {
    throw new ShippedValidationError(
      ["Chưa có chuyến giao hàng đã xuất hoặc đang giao."],
      { requiresExecutionFlow: true },
    );
  }

  const reason = input.shippedOverrideReason?.trim();
  if (!reason) {
    throw new ProductionExecutionValidationError(
      "Vui lòng nhập lý do xác nhận chuyển trạng thái khi chưa có chuyến giao hàng.",
    );
  }

  await prisma.orderActivity.create({
    data: {
      orderId,
      type: "DELIVERY_UPDATED",
      title: "Xác nhận chuyển sang Đã giao hàng khi chưa có chuyến giao hàng",
      detail: reason,
    },
  });
}

export async function assertCompletedTransition(
  orderId: string,
  input: {
    completionReadinessAcknowledged?: boolean;
    completionOverrideReason?: string | null;
  },
): Promise<CompletionReadinessResult> {
  const readiness = await evaluateCompletionReadiness(orderId);

  if (readiness.isReady) return readiness;

  if (!input.completionReadinessAcknowledged) {
    throw new CompletionValidationError(readiness.missingConditions);
  }

  const reason = input.completionOverrideReason?.trim();
  if (!reason) {
    throw new ProductionExecutionValidationError(
      "Vui lòng nhập lý do xác nhận hoàn tất đơn khi việc giao hàng chưa được xử lý đầy đủ.",
    );
  }

  await prisma.orderActivity.create({
    data: {
      orderId,
      type: "DELIVERY_UPDATED",
      title: "Xác nhận hoàn tất đơn khi giao hàng chưa đầy đủ",
      detail: `${reason}\nThiếu: ${readiness.missingConditions.join("; ")}`,
    },
  });

  return readiness;
}

export { ACTIVE_EXECUTION_STATUSES };
