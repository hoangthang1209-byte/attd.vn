import type { OrderStatus, QcInspectionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  HANDOVER_READINESS_LABELS,
  PRODUCTION_STAGE_TYPE_LABELS,
  type HandoverReadinessState,
} from "@/features/orders/production-execution-labels";
import { LEAN_OPS_STAGE_KEY_TO_TYPE } from "@/features/orders/lean-ops-execution-bridge";
import { computeStageProgressSummary } from "@/features/orders/production-stage.service";
import { qcBoardStatusLabel } from "@/features/orders/qc-inspection.service";
import { decimalToNumber } from "@/features/orders/production-quantity";
import type { ProductionBoardQcFilter } from "@/features/orders/production-execution-labels";

export type ProductionExecutionIndicators = {
  stageProgressLabel: string;
  stageCompletedCount: number;
  stageApplicableCount: number;
  qcStatus: QcInspectionStatus | null;
  qcStatusLabel: string;
  packingLabel: string;
  handoverState: HandoverReadinessState;
  handoverStateLabel: string;
  handoverReady: boolean;
  qcFilterKey: ProductionBoardQcFilter;
};

const OVERRIDE_TITLE = "Xác nhận chuyển sang Sẵn sàng giao khi hồ sơ chưa đầy đủ";

function resolveHandoverState(input: {
  orderStatus: OrderStatus;
  isReady: boolean;
  qcStatus: QcInspectionStatus | null;
}): HandoverReadinessState {
  if (
    input.orderStatus === "READY_TO_SHIP" ||
    input.orderStatus === "SHIPPED" ||
    input.orderStatus === "COMPLETED"
  ) {
    return "HANDED_OVER";
  }
  if (input.isReady) return "READY";
  if (!input.qcStatus || input.qcStatus === "DRAFT") return "NEEDS_QC";
  if (input.qcStatus === "REWORK_REQUIRED") return "NEEDS_REWORK";
  return "NOT_READY";
}

function resolveQcFilterKey(input: {
  qcStatus: QcInspectionStatus | null;
  handoverReady: boolean;
}): ProductionBoardQcFilter {
  if (input.handoverReady) return "ready";
  if (!input.qcStatus || input.qcStatus === "DRAFT") return "no_qc";
  if (input.qcStatus === "PASSED" || input.qcStatus === "PASSED_WITH_NOTE") return "passed";
  if (input.qcStatus === "REWORK_REQUIRED") return "rework";
  return "not_ready";
}

function computeIndicatorsFromRecords(input: {
  orderStatus: OrderStatus;
  stages: Array<{ stageType: string; status: string }>;
  qc: { status: QcInspectionStatus; passedQuantity: { toNumber(): number } } | null;
}): ProductionExecutionIndicators {
  const stageRecords = input.stages.map((s) => ({
    id: "",
    orderId: "",
    orderItemId: null,
    stageType: s.stageType as import("@prisma/client").ProductionStageType,
    stageTypeLabel: PRODUCTION_STAGE_TYPE_LABELS[s.stageType as keyof typeof PRODUCTION_STAGE_TYPE_LABELS] ?? s.stageType,
    status: s.status as import("@prisma/client").ProductionStageStatus,
    statusLabel: s.status,
    assignedEmployeeId: null,
    assignedEmployeeName: null,
    startedAt: null,
    completedAt: null,
    plannedQuantity: null,
    completedQuantity: "0",
    passedQuantity: "0",
    defectQuantity: "0",
    reworkQuantity: "0",
    scrapQuantity: "0",
    note: null,
    sortOrder: 0,
  }));

  const summary = computeStageProgressSummary(stageRecords);
  const qcStatus = input.qc?.status ?? null;
  const qcOk = qcStatus === "PASSED" || qcStatus === "PASSED_WITH_NOTE";
  const packingOk = summary.packingCompleted || summary.packingSkipped;
  const isReady = qcOk && packingOk && !summary.hasBlocked;

  const handoverState = resolveHandoverState({
    orderStatus: input.orderStatus,
    isReady,
    qcStatus,
  });

  return {
    stageProgressLabel: input.stages.length > 0 ? summary.progressLabel : "—",
    stageCompletedCount: summary.completedCount,
    stageApplicableCount: summary.applicableCount,
    qcStatus,
    qcStatusLabel: qcBoardStatusLabel(qcStatus),
    packingLabel: summary.packingCompleted
      ? "Đã đóng gói"
      : summary.packingSkipped
        ? "Bỏ qua"
        : "Chưa đóng gói",
    handoverState,
    handoverStateLabel: HANDOVER_READINESS_LABELS[handoverState],
    handoverReady: isReady,
    qcFilterKey: resolveQcFilterKey({ qcStatus, handoverReady: isReady }),
  };
}

export async function batchGetProductionExecutionIndicators(
  orders: Array<{ id: string; status: OrderStatus }>,
): Promise<Map<string, ProductionExecutionIndicators>> {
  const orderIds = orders.map((o) => o.id);
  const result = new Map<string, ProductionExecutionIndicators>();
  if (orderIds.length === 0) return result;

  const [stages, qcs, leanStages] = await Promise.all([
    prisma.orderProductionStage.findMany({
      where: { orderId: { in: orderIds } },
      select: { orderId: true, stageType: true, status: true },
    }),
    prisma.orderQcInspection.findMany({
      where: { orderId: { in: orderIds } },
      select: { orderId: true, status: true, passedQuantity: true },
    }),
    prisma.itemProductionStage.findMany({
      where: {
        productionItem: { orderItem: { orderId: { in: orderIds } } },
        isApplicable: true,
      },
      select: {
        stageKey: true,
        status: true,
        productionItem: { select: { orderItem: { select: { orderId: true } } } },
      },
    }),
  ]);

  const stagesByOrder = new Map<string, Array<{ stageType: string; status: string }>>();
  for (const stage of stages) {
    const list = stagesByOrder.get(stage.orderId) ?? [];
    list.push(stage);
    stagesByOrder.set(stage.orderId, list);
  }

  const leanByOrder = new Map<string, Array<{ stageType: string; status: string }>>();
  for (const stage of leanStages) {
    const orderId = stage.productionItem.orderItem.orderId;
    const list = leanByOrder.get(orderId) ?? [];
    list.push({
      stageType: LEAN_OPS_STAGE_KEY_TO_TYPE[stage.stageKey],
      status: stage.status,
    });
    leanByOrder.set(orderId, list);
  }

  const qcByOrder = new Map(qcs.map((q) => [q.orderId, q]));

  for (const order of orders) {
    const lean = leanByOrder.get(order.id);
    result.set(
      order.id,
      computeIndicatorsFromRecords({
        orderStatus: order.status,
        stages: lean && lean.length > 0 ? lean : stagesByOrder.get(order.id) ?? [],
        qc: qcByOrder.get(order.id) ?? null,
      }),
    );
  }

  return result;
}

export function matchesProductionQcFilter(
  indicators: ProductionExecutionIndicators,
  filter: ProductionBoardQcFilter,
): boolean {
  if (filter === "all") return true;
  return indicators.qcFilterKey === filter;
}

export { OVERRIDE_TITLE, decimalToNumber };
