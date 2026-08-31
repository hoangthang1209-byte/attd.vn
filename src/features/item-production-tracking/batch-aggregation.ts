import type {
  ItemProductionBatchStatus,
  ItemProductionRiskStatus,
  ItemProductionStageStatus,
} from "@prisma/client";
import {
  computeRiskStatus,
  computeWeightedProgressPercent,
  deriveCurrentStageKey,
  deriveReadyQuantity,
  type StageProgressInput,
} from "@/features/item-production-tracking/progress-risk";

export type BatchStageInput = StageProgressInput & {
  acceptedQuantity?: number;
  rejectedQuantity?: number;
  reworkQuantity?: number;
};

export type BatchRollupInput = {
  id: string;
  status: ItemProductionBatchStatus;
  plannedQuantity: number;
  progressPercent: number;
  readyQuantity: number;
  riskStatus: ItemProductionRiskStatus;
  supplierId: string | null;
  lastProgressAt: Date | null;
  actualStartAt: Date | null;
  actualEndAt: Date | null;
  plannedEndAt: Date | null;
  stages: BatchStageInput[];
};

const RISK_SEVERITY: Record<ItemProductionRiskStatus, number> = {
  ON_TRACK: 0,
  NEEDS_ATTENTION: 1,
  AT_RISK: 2,
  DELAYED: 3,
  BLOCKED: 4,
};

export function isActiveBatchStatus(status: ItemProductionBatchStatus): boolean {
  return status === "DRAFT" || status === "ACTIVE";
}

export function countsTowardAllocation(status: ItemProductionBatchStatus): boolean {
  return status !== "CANCELLED";
}

export function computeAllocatedQuantity(
  batches: Array<{ status: ItemProductionBatchStatus; plannedQuantity: number }>,
): number {
  return batches
    .filter((b) => countsTowardAllocation(b.status))
    .reduce((sum, b) => sum + Math.max(0, b.plannedQuantity), 0);
}

export function computeUnallocatedQuantity(
  parentPlannedQuantity: number,
  batches: Array<{ status: ItemProductionBatchStatus; plannedQuantity: number }>,
): number {
  return Math.max(0, parentPlannedQuantity - computeAllocatedQuantity(batches));
}

export function recomputeBatchFromStages(
  stages: BatchStageInput[],
  meta: {
    promisedDeliveryDate: Date | null;
    lastProgressAt: Date | null;
    hasSupplier: boolean;
    batchStatus: ItemProductionBatchStatus;
  },
) {
  const progressPercent = computeWeightedProgressPercent(stages);
  const readyQuantity = deriveReadyQuantity(stages);
  const currentStageKey = deriveCurrentStageKey(
    stages.map((s, i) => ({
      stageKey: s.stageKey,
      isApplicable: s.isApplicable,
      status: s.status,
      sequence: i,
    })),
  );
  const hasBlockedStage = stages.some((s) => s.isApplicable && s.status === "BLOCKED");
  const hasRejectedOrRework = stages.some(
    (s) => s.isApplicable && ((s.rejectedQuantity ?? 0) > 0 || (s.reworkQuantity ?? 0) > 0),
  );
  const productionStatus =
    meta.batchStatus === "COMPLETED"
      ? "COMPLETED"
      : meta.batchStatus === "CANCELLED"
        ? "CANCELLED"
        : meta.batchStatus === "DRAFT"
          ? "PLANNED"
          : "IN_PRODUCTION";
  const riskStatus = computeRiskStatus({
    promisedDeliveryDate: meta.promisedDeliveryDate,
    progressPercent,
    readyQuantity,
    plannedQuantity: stages.reduce((max, s) => Math.max(max, s.plannedQuantity), 0),
    lastProgressAt: meta.lastProgressAt,
    productionStatus,
    hasBlockedStage,
    hasRejectedOrRework,
    hasSupplier: meta.hasSupplier,
  });
  return { progressPercent, readyQuantity, currentStageKey, riskStatus };
}

export function computeParentRollupFromBatches(input: {
  parentPlannedQuantity: number;
  promisedDeliveryDate: Date | null;
  batches: BatchRollupInput[];
  hasUnallocatedWarning?: boolean;
}) {
  const activeBatches = input.batches.filter((b) => b.status === "ACTIVE");
  const rollupBatches = activeBatches.length > 0 ? activeBatches : input.batches.filter((b) => b.status === "COMPLETED");
  const allocatedQty = computeAllocatedQuantity(input.batches);
  const unallocatedQty = computeUnallocatedQuantity(input.parentPlannedQuantity, input.batches);

  let progressPercent = 0;
  let readyQuantity = 0;
  if (rollupBatches.length > 0) {
    const totalAlloc = rollupBatches.reduce((s, b) => s + b.plannedQuantity, 0);
    if (totalAlloc > 0) {
      progressPercent =
        Math.round(
          (rollupBatches.reduce((s, b) => s + Number(b.progressPercent) * b.plannedQuantity, 0) / totalAlloc) *
            100,
        ) / 100;
      readyQuantity = rollupBatches.reduce((s, b) => s + b.readyQuantity, 0);
    }
  }

  let riskStatus: ItemProductionRiskStatus = "ON_TRACK";
  let maxSeverity = -1;
  for (const batch of rollupBatches) {
    const sev = RISK_SEVERITY[batch.riskStatus];
    if (sev > maxSeverity) {
      maxSeverity = sev;
      riskStatus = batch.riskStatus;
    }
  }
  if (unallocatedQty > 0 && input.hasUnallocatedWarning) {
    const unallocSeverity = RISK_SEVERITY.NEEDS_ATTENTION;
    if (unallocSeverity > maxSeverity) riskStatus = "NEEDS_ATTENTION";
  }
  const missingSupplier = rollupBatches.some((b) => !b.supplierId);
  if (missingSupplier && maxSeverity < RISK_SEVERITY.NEEDS_ATTENTION) {
    riskStatus = "NEEDS_ATTENTION";
  }

  const currentStageKey = rollupBatches.length
    ? rollupBatches[0].stages.length > 0
      ? deriveCurrentStageKey(
          rollupBatches[0].stages.map((s, i) => ({
            stageKey: s.stageKey,
            isApplicable: s.isApplicable,
            status: s.status as ItemProductionStageStatus,
            sequence: i,
          })),
        )
      : null
    : null;

  const actualStartAt = rollupBatches.reduce<Date | null>((earliest, b) => {
    if (!b.actualStartAt) return earliest;
    if (!earliest || b.actualStartAt < earliest) return b.actualStartAt;
    return earliest;
  }, null);

  const allActiveComplete =
    activeBatches.length > 0 &&
    activeBatches.every((b) => b.status === "COMPLETED") &&
    unallocatedQty === 0;
  const actualCompletedAt = allActiveComplete
    ? rollupBatches.reduce<Date | null>((latest, b) => {
        if (!b.actualEndAt) return latest;
        if (!latest || b.actualEndAt > latest) return b.actualEndAt;
        return latest;
      }, null)
    : null;

  const lastProgressAt = rollupBatches.reduce<Date | null>((latest, b) => {
    if (!b.lastProgressAt) return latest;
    if (!latest || b.lastProgressAt > latest) return b.lastProgressAt;
    return latest;
  }, null);

  const supplierIds = new Set(
    rollupBatches.map((b) => b.supplierId).filter((id): id is string => id != null),
  );

  return {
    progressPercent,
    readyQuantity: Math.min(readyQuantity, input.parentPlannedQuantity),
    riskStatus,
    currentStageKey,
    allocatedQuantity: allocatedQty,
    unallocatedQuantity: unallocatedQty,
    batchCount: input.batches.filter((b) => b.status !== "CANCELLED").length,
    activeBatchCount: activeBatches.length,
    supplierCount: supplierIds.size,
    actualStartAt,
    actualCompletedAt,
    lastProgressAt,
    hasBatches: input.batches.some((b) => b.status !== "CANCELLED"),
    usesBatchExecution: activeBatches.length > 0 || input.batches.some((b) => b.status === "COMPLETED"),
  };
}

export function hasMaterialItemProgress(
  stages: Array<{
    isApplicable: boolean;
    status: ItemProductionStageStatus;
    completedQuantity: number;
    acceptedQuantity: number;
  }>,
): boolean {
  return stages.some(
    (s) =>
      s.isApplicable &&
      (s.completedQuantity > 0 ||
        s.acceptedQuantity > 0 ||
        s.status === "IN_PROGRESS" ||
        s.status === "BLOCKED" ||
        s.status === "COMPLETED"),
  );
}

export function maxCompletedQuantity(stages: BatchStageInput[]): number {
  return stages.reduce((max, s) => Math.max(max, s.completedQuantity), 0);
}

export function generateBatchCode(orderItemId: string, sequence: number): string {
  const short = orderItemId.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase().padStart(6, "0");
  return `POI-${short}-B${String(sequence).padStart(2, "0")}`;
}
