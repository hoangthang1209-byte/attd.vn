import type { ProductionPlanStatus } from "@prisma/client";
import type { ProductionStageRecord } from "@/features/orders/production-stage.service";
import type { QcInspectionRecord } from "@/features/orders/qc-inspection.service";
import { computeStageProgressSummary } from "@/features/orders/production-stage.service";
import type { OrderItemReadinessState } from "@/features/orders/order-item-readiness";
import type {
  ProductionPlanDocStatus,
  ProductionPlanMaterialStatus,
  ProductionPlanQcStatus,
  ProductionBoardColumnKey,
} from "@/features/production-planning/production-plan.types";

export function resolveDocStatus(input: {
  needsDocs: boolean;
  hasDesignFile: boolean;
  activeFileCount: number;
}): ProductionPlanDocStatus {
  if (!input.needsDocs) return "ok";
  if (input.hasDesignFile || input.activeFileCount > 0) return "ok";
  return "missing";
}

export function resolveMaterialStatus(input: {
  hasRequirements: boolean;
  hasShortage: boolean;
}): ProductionPlanMaterialStatus {
  if (!input.hasRequirements) return "ok";
  if (input.hasShortage) return "shortage";
  return "pending";
}

export function resolveQcStatus(input: {
  allowQc: boolean;
  readiness: OrderItemReadinessState;
  qc: Pick<QcInspectionRecord, "status"> | null;
}): ProductionPlanQcStatus {
  if (!input.allowQc) return "not_applicable";
  if (input.qc?.status === "REWORK_REQUIRED" || input.qc?.status === "FAILED") return "rework";
  if (input.qc && ["PASSED", "PASSED_WITH_NOTE"].includes(input.qc.status)) return "passed";
  if (input.readiness === "AWAITING_QC") return "awaiting";
  if (input.readiness === "READY_TO_SHIP") return "passed";
  return "not_applicable";
}

export function deriveProductionPlanStatus(input: {
  hasPlan: boolean;
  storedStatus: ProductionPlanStatus | null;
  readiness: OrderItemReadinessState;
  docStatus: ProductionPlanDocStatus;
  materialStatus: ProductionPlanMaterialStatus;
  qcStatus: ProductionPlanQcStatus;
  stages: ProductionStageRecord[];
}): ProductionPlanStatus {
  if (input.storedStatus === "ON_HOLD") return "ON_HOLD";
  if (input.readiness === "READY_TO_SHIP") return "COMPLETED";
  if (input.qcStatus === "rework" || input.readiness === "NEEDS_ATTENTION") return "REWORK";
  if (input.readiness === "AWAITING_QC" || input.qcStatus === "awaiting") return "WAITING_QC";
  if (input.readiness === "IN_PRODUCTION") return "IN_PROGRESS";

  const stageSummary = computeStageProgressSummary(input.stages);
  const inProgress = input.stages.some((s) => s.status === "IN_PROGRESS");
  if (inProgress || stageSummary.completedCount > 0) return "IN_PROGRESS";

  if (input.docStatus === "missing") return "WAITING_DOCUMENTS";
  if (input.materialStatus === "shortage") return "WAITING_MATERIALS";

  if (!input.hasPlan) return "NOT_PLANNED";
  return "READY_TO_START";
}

export function mapStatusToBoardColumn(status: ProductionPlanStatus): ProductionBoardColumnKey {
  switch (status) {
    case "WAITING_DOCUMENTS":
      return "waiting_docs";
    case "WAITING_MATERIALS":
      return "waiting_materials";
    case "READY_TO_START":
    case "NOT_PLANNED":
      return "ready_to_start";
    case "IN_PROGRESS":
      return "in_progress";
    case "WAITING_QC":
      return "awaiting_qc";
    case "REWORK":
      return "rework";
    case "COMPLETED":
      return "completed";
    case "ON_HOLD":
      return "ready_to_start";
    default:
      return "ready_to_start";
  }
}
