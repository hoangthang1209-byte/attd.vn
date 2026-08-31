import type {
  ItemProductionStageKey,
  ItemProductionStageStatus,
  ProductionStageStatus,
  ProductionStageType,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ITEM_PRODUCTION_STAGE_LABELS } from "@/features/item-production-tracking/config";
import { deriveReadyQuantity } from "@/features/item-production-tracking/progress-risk";
import {
  PRODUCTION_STAGE_STATUS_LABELS,
  PRODUCTION_STAGE_TYPE_LABELS,
} from "@/features/orders/production-execution-labels";
import type { ProductionStageRecord } from "@/features/orders/production-stage.service";

/** Lean Ops stage keys → legacy ProductionStageType used by handover/readiness consumers. */
export const LEAN_OPS_STAGE_KEY_TO_TYPE: Record<ItemProductionStageKey, ProductionStageType> = {
  MATERIAL_SYNC: "OTHER",
  CUTTING: "CUTTING",
  PRINT_EMBROIDERY: "PRINTING",
  SEWING: "SEWING",
  WASHING: "OTHER",
  FINISHING: "FINISHING",
  IRONING: "FINISHING",
  QC: "QC",
  PACKING: "PACKING",
  READY_TO_SHIP: "OTHER",
};

export type LeanOpsStageRow = {
  id: string;
  stageKey: ItemProductionStageKey;
  labelSnapshot: string;
  sequence: number;
  isApplicable: boolean;
  status: ItemProductionStageStatus;
  plannedQuantity: number;
  completedQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
  reworkQuantity: number;
  note: string | null;
  actualStartAt: Date | null;
  actualEndAt: Date | null;
};

export type LeanOpsTrackingRow = {
  id: string;
  orderItemId: string;
  readyQuantity: number;
  stages: LeanOpsStageRow[];
};

export function mapLeanOpsStatusToProductionStatus(
  status: ItemProductionStageStatus,
  isApplicable: boolean,
): ProductionStageStatus {
  if (!isApplicable) return "SKIPPED";
  return status;
}

export function mapLeanOpsStageToProductionStageRecord(input: {
  orderId: string;
  orderItemId: string;
  stage: LeanOpsStageRow;
}): ProductionStageRecord {
  const stageType = LEAN_OPS_STAGE_KEY_TO_TYPE[input.stage.stageKey];
  const status = mapLeanOpsStatusToProductionStatus(input.stage.status, input.stage.isApplicable);
  const label =
    input.stage.labelSnapshot ||
    ITEM_PRODUCTION_STAGE_LABELS[input.stage.stageKey] ||
    PRODUCTION_STAGE_TYPE_LABELS[stageType];

  return {
    id: input.stage.id,
    orderId: input.orderId,
    orderItemId: input.orderItemId,
    stageType,
    stageTypeLabel: label,
    status,
    statusLabel: PRODUCTION_STAGE_STATUS_LABELS[status],
    assignedEmployeeId: null,
    assignedEmployeeName: null,
    startedAt: input.stage.actualStartAt?.toISOString() ?? null,
    completedAt: input.stage.actualEndAt?.toISOString() ?? null,
    plannedQuantity: String(input.stage.plannedQuantity),
    completedQuantity: String(input.stage.completedQuantity),
    passedQuantity: String(input.stage.acceptedQuantity),
    defectQuantity: String(input.stage.rejectedQuantity),
    reworkQuantity: String(input.stage.reworkQuantity),
    scrapQuantity: "0",
    note: input.stage.note,
    sortOrder: input.stage.sequence,
  };
}

export function mapLeanOpsTrackingToStages(
  orderId: string,
  tracking: LeanOpsTrackingRow,
): ProductionStageRecord[] {
  return tracking.stages
    .slice()
    .sort((a, b) => a.sequence - b.sequence)
    .map((stage) =>
      mapLeanOpsStageToProductionStageRecord({
        orderId,
        orderItemId: tracking.orderItemId,
        stage,
      }),
    );
}

/** Prefer stored readyQuantity; otherwise derive from READY_TO_SHIP / PACKING stages. */
export function resolveLeanOpsReadyQuantity(tracking: LeanOpsTrackingRow): number {
  if (Number.isFinite(tracking.readyQuantity) && tracking.readyQuantity > 0) {
    return tracking.readyQuantity;
  }

  const readyStage = tracking.stages.find((s) => s.stageKey === "READY_TO_SHIP" && s.isApplicable);
  if (readyStage && readyStage.completedQuantity > 0) {
    return readyStage.completedQuantity;
  }

  const packing = tracking.stages.find((s) => s.stageKey === "PACKING" && s.isApplicable);
  if (packing) {
    return Math.max(0, packing.acceptedQuantity || packing.completedQuantity);
  }

  return deriveReadyQuantity(
    tracking.stages.map((s) => ({
      stageKey: s.stageKey,
      isApplicable: s.isApplicable,
      weight: 10,
      status: s.status,
      plannedQuantity: s.plannedQuantity,
      completedQuantity: s.completedQuantity,
      acceptedQuantity: s.acceptedQuantity,
    })),
  );
}

export function isLeanOpsItemPackingReady(stages: LeanOpsStageRow[]): boolean {
  const packing = stages.find((s) => s.stageKey === "PACKING");
  if (packing) {
    if (!packing.isApplicable || packing.status === "SKIPPED") return true;
    return packing.status === "COMPLETED";
  }
  const ready = stages.find((s) => s.stageKey === "READY_TO_SHIP");
  if (ready) {
    if (!ready.isApplicable || ready.status === "SKIPPED") return true;
    return ready.status === "COMPLETED";
  }
  const applicable = stages.filter((s) => s.isApplicable && s.status !== "SKIPPED");
  return applicable.length > 0 && applicable.every((s) => s.status === "COMPLETED");
}

export function isLeanOpsItemBlocked(stages: LeanOpsStageRow[]): boolean {
  return stages.some((s) => s.isApplicable && s.status === "BLOCKED");
}

export async function orderHasLeanOpsTracking(orderId: string): Promise<boolean> {
  const count = await prisma.itemProductionTracking.count({
    where: { orderItem: { orderId } },
  });
  return count > 0;
}

export async function loadLeanOpsTrackingsForOrder(
  orderId: string,
): Promise<Map<string, LeanOpsTrackingRow>> {
  const rows = await prisma.itemProductionTracking.findMany({
    where: { orderItem: { orderId } },
    select: {
      id: true,
      orderItemId: true,
      readyQuantity: true,
      stages: {
        orderBy: { sequence: "asc" },
        select: {
          id: true,
          stageKey: true,
          labelSnapshot: true,
          sequence: true,
          isApplicable: true,
          status: true,
          plannedQuantity: true,
          completedQuantity: true,
          acceptedQuantity: true,
          rejectedQuantity: true,
          reworkQuantity: true,
          note: true,
          actualStartAt: true,
          actualEndAt: true,
        },
      },
    },
  });

  const map = new Map<string, LeanOpsTrackingRow>();
  for (const row of rows) {
    map.set(row.orderItemId, {
      id: row.id,
      orderItemId: row.orderItemId,
      readyQuantity: row.readyQuantity,
      stages: row.stages,
    });
  }
  return map;
}
