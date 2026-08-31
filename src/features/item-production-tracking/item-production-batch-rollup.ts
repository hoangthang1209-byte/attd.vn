import type { Prisma } from "@prisma/client";
import { ITEM_PRODUCTION_RISK_CONFIG } from "@/features/item-production-tracking/config";
import {
  computeParentRollupFromBatches,
  computeUnallocatedQuantity,
} from "@/features/item-production-tracking/batch-aggregation";
import { deriveDeliveryStatus } from "@/features/item-production-tracking/progress-risk";

export async function rollupParentFromBatches(
  tx: Prisma.TransactionClient,
  productionItemId: string,
) {
  const tracking = await tx.itemProductionTracking.findUnique({
    where: { id: productionItemId },
    include: {
      batches: {
        include: { stages: { orderBy: { sequence: "asc" } } },
      },
    },
  });
  if (!tracking) return;

  const batchInputs = tracking.batches.map((b) => ({
    id: b.id,
    status: b.status,
    plannedQuantity: b.plannedQuantity,
    progressPercent: Number(b.progressPercent),
    readyQuantity: b.readyQuantity,
    riskStatus: b.riskStatus,
    supplierId: b.supplierId,
    lastProgressAt: b.lastProgressAt,
    actualStartAt: b.actualStartAt,
    actualEndAt: b.actualEndAt,
    plannedEndAt: b.plannedEndAt,
    stages: b.stages.map((s) => ({
      stageKey: s.stageKey,
      isApplicable: s.isApplicable,
      weight: s.weight,
      status: s.status,
      plannedQuantity: s.plannedQuantity,
      completedQuantity: s.completedQuantity,
      acceptedQuantity: s.acceptedQuantity,
      rejectedQuantity: s.rejectedQuantity,
      reworkQuantity: s.reworkQuantity,
    })),
  }));

  const unallocated = computeUnallocatedQuantity(tracking.plannedQuantity, tracking.batches);
  const hasUnallocatedWarning = unallocated > 0;

  const rollup = computeParentRollupFromBatches({
    parentPlannedQuantity: tracking.plannedQuantity,
    promisedDeliveryDate: tracking.promisedDeliveryDate,
    batches: batchInputs,
    hasUnallocatedWarning,
  });

  if (!rollup.usesBatchExecution) {
    return;
  }

  const deliveryStatus = deriveDeliveryStatus({
    readyQuantity: rollup.readyQuantity,
    plannedQuantity: tracking.plannedQuantity,
  });

  let productionStatus = tracking.productionStatus;
  if (rollup.activeBatchCount > 0) {
    if (rollup.progressPercent >= 100 && unallocated === 0) {
      productionStatus = "COMPLETED";
    } else if (rollup.progressPercent >= 70) {
      productionStatus = "FINISHING";
    } else if (rollup.progressPercent > 0 || rollup.activeBatchCount > 0) {
      productionStatus = "IN_PRODUCTION";
    } else {
      productionStatus = "PLANNED";
    }
  }

  await tx.itemProductionTracking.update({
    where: { id: productionItemId },
    data: {
      progressPercent: rollup.progressPercent,
      readyQuantity: rollup.readyQuantity,
      riskStatus: rollup.riskStatus,
      currentStageKey: rollup.currentStageKey,
      deliveryStatus,
      productionStatus,
      lastProgressAt: rollup.lastProgressAt ?? tracking.lastProgressAt,
      actualCompletedAt: rollup.actualCompletedAt,
      rowVersion: { increment: 1 },
    },
  });
}

export function shouldWarnUnallocatedNearDue(
  unallocatedQuantity: number,
  promisedDeliveryDate: Date | null,
  now = new Date(),
): boolean {
  if (unallocatedQuantity <= 0 || !promisedDeliveryDate) return false;
  const daysLeft =
    (promisedDeliveryDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000);
  return daysLeft <= ITEM_PRODUCTION_RISK_CONFIG.atRiskDaysBeforeDue;
}
