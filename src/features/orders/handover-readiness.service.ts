import type { OrderStatus, QcInspectionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveOrderItemTotalQuantity } from "@/features/orders/bom-calculations";
import {
  evaluateProductionReadiness,
  isLegacyOrderForReadiness,
} from "@/features/orders/production-readiness.service";
import {
  HANDOVER_READINESS_LABELS,
  PRODUCTION_STAGE_TYPE_LABELS,
  type HandoverReadinessState,
} from "@/features/orders/production-execution-labels";
import {
  computeStageProgressSummary,
  ensureProductionStagesInitializedForOrder,
  type ProductionStageRecord,
} from "@/features/orders/production-stage.service";
import {
  HandoverValidationError,
  ProductionExecutionValidationError,
} from "@/features/orders/production-quantity";
import {
  getQcInspection,
  qcBoardStatusLabel,
  type QcInspectionRecord,
} from "@/features/orders/qc-inspection.service";
import { buildProductionExecutionBundle } from "@/features/orders/production-execution.service";

export type HandoverReadinessResult = {
  state: HandoverReadinessState;
  stateLabel: string;
  isReady: boolean;
  missingConditions: string[];
  expectedOrderQuantity: number;
  productionCompletedQuantity: number;
  qcPassedQuantity: number;
  reworkQuantity: number;
  defectAndScrapQuantity: number;
  packingCompleted: boolean;
  packingSkipped: boolean;
  stageProgressLabel: string;
  qcStatusLabel: string;
  hasBlockedStage: boolean;
  partialDeliveryAllowed: boolean;
  usedOverride: boolean;
  overrideReason: string | null;
};

export function isLegacyOrderForHandover(input: {
  status: OrderStatus;
  readyToShipAt: Date | null;
}): boolean {
  if (input.readyToShipAt) return true;
  return input.status === "READY_TO_SHIP" || input.status === "SHIPPED" || input.status === "COMPLETED";
}

function resolveHandoverState(input: {
  orderStatus: OrderStatus;
  isReady: boolean;
  qcStatus: QcInspectionStatus | null;
}): HandoverReadinessState {
  if (input.orderStatus === "READY_TO_SHIP" || input.orderStatus === "SHIPPED" || input.orderStatus === "COMPLETED") {
    return "HANDED_OVER";
  }
  if (input.isReady) return "READY";
  if (!input.qcStatus || input.qcStatus === "DRAFT") return "NEEDS_QC";
  if (input.qcStatus === "REWORK_REQUIRED") return "NEEDS_REWORK";
  return "NOT_READY";
}

function qtyNum(value: string | null | undefined): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function computeProductionCompletedQuantity(stages: ProductionStageRecord[]): number {
  const finishing = stages.find((s) => s.stageType === "FINISHING");
  if (finishing && finishing.status === "COMPLETED") {
    return qtyNum(finishing.completedQuantity);
  }
  const sewing = stages.find((s) => s.stageType === "SEWING");
  if (sewing && sewing.status === "COMPLETED") {
    return qtyNum(sewing.completedQuantity);
  }
  const completedStages = stages.filter((s) => s.status === "COMPLETED");
  if (completedStages.length === 0) return 0;
  return Math.max(...completedStages.map((s) => qtyNum(s.completedQuantity)));
}

export async function evaluateHandoverReadiness(
  orderId: string,
  options?: { partialDeliveryAcknowledged?: boolean },
): Promise<HandoverReadinessResult> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: { include: { variants: true } },
    },
  });
  if (!order) {
    throw new ProductionExecutionValidationError("Không tìm thấy đơn hàng.");
  }

  const bundle = await buildProductionExecutionBundle(orderId);
  const stages = bundle.isLegacy
    ? bundle.legacyStages
    : bundle.items.flatMap((item) => item.stages);
  const stageSummary = computeStageProgressSummary(stages);
  const expectedOrderQuantity = order.items.reduce(
    (sum, item) => sum + resolveOrderItemTotalQuantity(item),
    0,
  );

  const missingConditions: string[] = [];

  let qcPassed = 0;
  let qcStatus: QcInspectionStatus | null = null;
  let reworkQuantity = 0;
  let defectAndScrap = 0;

  if (bundle.isLegacy) {
    const qc = bundle.legacyQc;
    qcPassed = qc ? qtyNum(qc.passedQuantity) : 0;
    qcStatus = qc?.status ?? null;
    reworkQuantity = qc ? qtyNum(qc.reworkQuantity) : 0;
    defectAndScrap = qc ? qtyNum(qc.defectQuantity) + qtyNum(qc.scrapQuantity) : 0;
  } else {
    const itemQcRecords = bundle.items.map((item) => item.qc).filter(Boolean) as QcInspectionRecord[];
    qcPassed = itemQcRecords.reduce((sum, qc) => sum + qtyNum(qc.passedQuantity), 0);
    reworkQuantity = itemQcRecords.reduce((sum, qc) => sum + qtyNum(qc.reworkQuantity), 0);
    defectAndScrap = itemQcRecords.reduce(
      (sum, qc) => sum + qtyNum(qc.defectQuantity) + qtyNum(qc.scrapQuantity),
      0,
    );
    const allItemsQcDone = bundle.items.every(
      (item) =>
        item.qc &&
        (item.qc.status === "PASSED" ||
          item.qc.status === "PASSED_WITH_NOTE" ||
          item.qc.status === "FAILED" ||
          item.qc.status === "REWORK_REQUIRED"),
    );
    const allItemsPassed = bundle.items.every(
      (item) =>
        item.qc &&
        (item.qc.status === "PASSED" || item.qc.status === "PASSED_WITH_NOTE"),
    );
    if (bundle.items.some((item) => item.qc?.status === "REWORK_REQUIRED")) {
      qcStatus = "REWORK_REQUIRED";
    } else if (bundle.items.some((item) => item.qc?.status === "FAILED")) {
      qcStatus = "FAILED";
    } else if (allItemsPassed) {
      qcStatus = "PASSED";
    } else if (allItemsQcDone) {
      qcStatus = "DRAFT";
    } else {
      qcStatus = null;
    }
  }

  const qcOk = qcStatus === "PASSED" || qcStatus === "PASSED_WITH_NOTE";

  if (!qcOk) {
    if (!qcStatus || qcStatus === "DRAFT") {
      missingConditions.push("Chưa hoàn tất kiểm tra chất lượng.");
    } else if (qcStatus === "FAILED") {
      missingConditions.push("Kết quả QC không đạt.");
    } else if (qcStatus === "REWORK_REQUIRED") {
      missingConditions.push("QC yêu cầu làm lại.");
    }
  }

  const quantityOk =
    qcPassed >= expectedOrderQuantity || options?.partialDeliveryAcknowledged === true;
  if (qcOk && !quantityOk) {
    missingConditions.push("Số lượng QC đạt chưa đủ.");
  }

  const packingOk = bundle.isLegacy
    ? stageSummary.packingCompleted || stageSummary.packingSkipped
    : bundle.items.every((item) => {
        const summary = computeStageProgressSummary(item.stages);
        return summary.packingCompleted || summary.packingSkipped || item.stages.length === 0;
      });
  if (!packingOk) {
    missingConditions.push("Chưa hoàn tất đóng gói.");
  }

  if (stageSummary.hasBlocked) {
    const blocked = stages.filter((s) => s.status === "BLOCKED");
    for (const stage of blocked) {
      missingConditions.push(`Công đoạn ${PRODUCTION_STAGE_TYPE_LABELS[stage.stageType]} đang tạm dừng.`);
    }
  }

  const legacyReadiness = isLegacyOrderForReadiness({
    status: order.status,
    productionStartedAt: order.productionStartedAt,
    createdAt: order.createdAt,
  });
  if (!legacyReadiness) {
    const readiness = await evaluateProductionReadiness(orderId);
    if (!readiness.isReady) {
      missingConditions.push("Hồ sơ sản xuất / nguyên liệu chưa sẵn sàng.");
    }
  }

  const isReady = missingConditions.length === 0;
  const state = resolveHandoverState({
    orderStatus: order.status,
    isReady,
    qcStatus,
  });

  const reworkQuantityFinal = reworkQuantity;
  const defectAndScrapFinal = defectAndScrap;

  return {
    state,
    stateLabel: HANDOVER_READINESS_LABELS[state],
    isReady,
    missingConditions,
    expectedOrderQuantity,
    productionCompletedQuantity: computeProductionCompletedQuantity(stages),
    qcPassedQuantity: qcPassed,
    reworkQuantity: reworkQuantityFinal,
    defectAndScrapQuantity: defectAndScrapFinal,
    packingCompleted: stageSummary.packingCompleted,
    packingSkipped: stageSummary.packingSkipped,
    stageProgressLabel: stageSummary.progressLabel,
    qcStatusLabel: qcBoardStatusLabel(qcStatus),
    hasBlockedStage: stageSummary.hasBlocked,
    partialDeliveryAllowed: expectedOrderQuantity > 0 && qcPassed > 0 && qcPassed < expectedOrderQuantity,
    usedOverride: false,
    overrideReason: null,
  };
}

export async function assertReadyToShipTransition(
  orderId: string,
  input: {
    handoverReadinessAcknowledged?: boolean;
    handoverOverrideReason?: string | null;
    partialDeliveryAcknowledged?: boolean;
  },
): Promise<HandoverReadinessResult> {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new ProductionExecutionValidationError("Không tìm thấy đơn hàng.");

  if (isLegacyOrderForHandover({
    status: order.status,
    readyToShipAt: order.readyToShipAt,
  }) && order.status !== "IN_PRODUCTION") {
    return evaluateHandoverReadiness(orderId);
  }

  const readiness = await evaluateHandoverReadiness(orderId, {
    partialDeliveryAcknowledged: input.partialDeliveryAcknowledged,
  });

  if (readiness.isReady) {
    return readiness;
  }

  if (!input.handoverReadinessAcknowledged) {
    throw new HandoverValidationError(readiness.missingConditions);
  }

  const reason = input.handoverOverrideReason?.trim();
  if (!reason) {
    throw new ProductionExecutionValidationError(
      "Vui lòng nhập lý do xác nhận chuyển đơn khi hồ sơ hoàn thành chưa đầy đủ.",
    );
  }

  await prisma.orderActivity.create({
    data: {
      orderId,
      type: "PRODUCTION_UPDATED",
      title: "Xác nhận chuyển sang Sẵn sàng giao khi hồ sơ chưa đầy đủ",
      detail: `${reason}\nThiếu: ${readiness.missingConditions.join("; ")}`,
    },
  });

  return {
    ...readiness,
    usedOverride: true,
    overrideReason: reason,
  };
}

export type OrderExecutionSummary = {
  stageProgressLabel: string;
  qcStatusLabel: string;
  packingLabel: string;
  handoverState: HandoverReadinessState;
  handoverStateLabel: string;
  handoverUsedOverride: boolean;
};

export async function getOrderExecutionSummary(orderId: string): Promise<OrderExecutionSummary> {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    throw new ProductionExecutionValidationError("Không tìm thấy đơn hàng.");
  }

  const stageCount = await prisma.orderProductionStage.count({ where: { orderId } });
  const stages = stageCount > 0
    ? await ensureProductionStagesInitializedForOrder(orderId)
    : [];
  const stageSummary = computeStageProgressSummary(stages);
  const qc = await getQcInspection(orderId, null);
  const readiness = await evaluateHandoverReadiness(orderId);

  const overrideActivity = await prisma.orderActivity.findFirst({
    where: {
      orderId,
      title: "Xác nhận chuyển sang Sẵn sàng giao khi hồ sơ chưa đầy đủ",
    },
    orderBy: { createdAt: "desc" },
  });

  return {
    stageProgressLabel: stages.length > 0 ? stageSummary.progressLabel : "—",
    qcStatusLabel: qcBoardStatusLabel(qc?.status),
    packingLabel: stageSummary.packingCompleted
      ? "Đã đóng gói"
      : stageSummary.packingSkipped
        ? "Bỏ qua đóng gói"
        : "Chưa đóng gói",
    handoverState: readiness.state,
    handoverStateLabel: readiness.stateLabel,
    handoverUsedOverride: Boolean(overrideActivity),
  };
}

export async function logHandoverOverride(
  orderId: string,
  reason: string,
  missingConditions: string[],
): Promise<void> {
  await prisma.orderActivity.create({
    data: {
      orderId,
      type: "PRODUCTION_UPDATED",
      title: "Xác nhận chuyển sang Sẵn sàng giao khi hồ sơ chưa đầy đủ",
      detail: `${reason}\nThiếu: ${missingConditions.join("; ")}`,
    },
  });
}

export type { QcInspectionRecord };
