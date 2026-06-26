import type { OrderItemProcessingMethod, OrderItemSupplySource } from "@prisma/client";
import type { ProductionStageRecord } from "@/features/orders/production-stage.service";
import type { QcInspectionRecord } from "@/features/orders/qc-inspection.service";
import { computeStageProgressSummary } from "@/features/orders/production-stage.service";
import { itemRequiresProductionDocuments } from "@/features/orders/order-item-stage-profile";
import { getOrderItemOperationalFlow } from "@/features/orders/order-item-classification";
import { DESIGN_FILE_TYPES } from "@/features/orders/production-pack-labels";

export type OrderItemReadinessState =
  | "MISSING_DOCS"
  | "AWAITING_PRODUCTION"
  | "IN_PRODUCTION"
  | "AWAITING_QC"
  | "READY_TO_SHIP"
  | "NEEDS_ATTENTION";

export const ORDER_ITEM_READINESS_LABELS: Record<OrderItemReadinessState, string> = {
  MISSING_DOCS: "Chưa đủ hồ sơ",
  AWAITING_PRODUCTION: "Chờ sản xuất",
  IN_PRODUCTION: "Đang sản xuất",
  AWAITING_QC: "Chờ QC",
  READY_TO_SHIP: "Sẵn sàng giao",
  NEEDS_ATTENTION: "Có vấn đề cần xử lý",
};

function qtyNum(value: string | null | undefined): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export function evaluateOrderItemReadiness(input: {
  supplySource?: OrderItemSupplySource | null;
  processingMethod?: OrderItemProcessingMethod | null;
  orderedQuantity: number;
  stages: ProductionStageRecord[];
  qc: QcInspectionRecord | null;
  activeFileCount: number;
  hasDesignFile: boolean;
}): { state: OrderItemReadinessState; stateLabel: string } {
  const flow = getOrderItemOperationalFlow({
    supplySource: input.supplySource,
    processingMethod: input.processingMethod,
  });

  const needsDocs = itemRequiresProductionDocuments({
    supplySource: input.supplySource,
    processingMethod: input.processingMethod,
  });

  if (needsDocs && !input.hasDesignFile && input.activeFileCount === 0) {
    return { state: "MISSING_DOCS", stateLabel: ORDER_ITEM_READINESS_LABELS.MISSING_DOCS };
  }

  if (!flow.allowProductionOperation) {
    const packing = input.stages.find((s) => s.stageType === "PACKING");
    if (packing?.status === "COMPLETED" || packing?.status === "SKIPPED") {
      return { state: "READY_TO_SHIP", stateLabel: ORDER_ITEM_READINESS_LABELS.READY_TO_SHIP };
    }
    if (input.qc && ["PASSED", "PASSED_WITH_NOTE"].includes(input.qc.status)) {
      return { state: "READY_TO_SHIP", stateLabel: ORDER_ITEM_READINESS_LABELS.READY_TO_SHIP };
    }
    return { state: "AWAITING_PRODUCTION", stateLabel: ORDER_ITEM_READINESS_LABELS.AWAITING_PRODUCTION };
  }

  const stageSummary = computeStageProgressSummary(input.stages);
  const hasBlocked = stageSummary.hasBlocked;
  const inProgress = input.stages.some((s) => s.status === "IN_PROGRESS");
  const allApplicableDone =
    stageSummary.applicableCount > 0 && stageSummary.completedCount === stageSummary.applicableCount;

  if (hasBlocked || input.qc?.status === "FAILED" || input.qc?.status === "REWORK_REQUIRED") {
    return { state: "NEEDS_ATTENTION", stateLabel: ORDER_ITEM_READINESS_LABELS.NEEDS_ATTENTION };
  }

  if (allApplicableDone && stageSummary.packingCompleted) {
    if (flow.allowQc) {
      if (input.qc && ["PASSED", "PASSED_WITH_NOTE"].includes(input.qc.status)) {
        const passed = qtyNum(input.qc.passedQuantity);
        if (passed >= input.orderedQuantity) {
          return { state: "READY_TO_SHIP", stateLabel: ORDER_ITEM_READINESS_LABELS.READY_TO_SHIP };
        }
      }
      return { state: "AWAITING_QC", stateLabel: ORDER_ITEM_READINESS_LABELS.AWAITING_QC };
    }
    return { state: "READY_TO_SHIP", stateLabel: ORDER_ITEM_READINESS_LABELS.READY_TO_SHIP };
  }

  if (inProgress || stageSummary.completedCount > 0) {
    return { state: "IN_PRODUCTION", stateLabel: ORDER_ITEM_READINESS_LABELS.IN_PRODUCTION };
  }

  return { state: "AWAITING_PRODUCTION", stateLabel: ORDER_ITEM_READINESS_LABELS.AWAITING_PRODUCTION };
}

export function aggregateOrderReadinessFromItems(
  itemStates: OrderItemReadinessState[],
): OrderItemReadinessState {
  if (itemStates.length === 0) return "AWAITING_PRODUCTION";
  if (itemStates.some((s) => s === "NEEDS_ATTENTION")) return "NEEDS_ATTENTION";
  if (itemStates.some((s) => s === "MISSING_DOCS")) return "MISSING_DOCS";
  if (itemStates.every((s) => s === "READY_TO_SHIP")) return "READY_TO_SHIP";
  if (itemStates.some((s) => s === "AWAITING_QC")) return "AWAITING_QC";
  if (itemStates.some((s) => s === "IN_PRODUCTION")) return "IN_PRODUCTION";
  return "AWAITING_PRODUCTION";
}

export function itemHasDesignFile(
  files: Array<{ type: string; status: string }>,
): boolean {
  return files.some(
    (f) => f.status === "ACTIVE" && DESIGN_FILE_TYPES.includes(f.type as (typeof DESIGN_FILE_TYPES)[number]),
  );
}
