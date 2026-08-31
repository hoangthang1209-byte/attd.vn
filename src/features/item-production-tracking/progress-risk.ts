import type {
  ItemProductionDeliveryStatus,
  ItemProductionRiskStatus,
  ItemProductionStageKey,
  ItemProductionStageStatus,
  ItemProductionStatus,
} from "@prisma/client";
import {
  ITEM_PRODUCTION_DEFAULT_WEIGHTS,
  ITEM_PRODUCTION_RISK_CONFIG,
} from "@/features/item-production-tracking/config";

export type StageProgressInput = {
  stageKey: ItemProductionStageKey;
  isApplicable: boolean;
  weight: number;
  status: ItemProductionStageStatus;
  plannedQuantity: number;
  completedQuantity: number;
};

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

export function stageCompletionRatio(stage: StageProgressInput): number {
  if (!stage.isApplicable || stage.status === "SKIPPED") return 0;
  if (stage.status === "COMPLETED") return 1;
  if (stage.plannedQuantity <= 0) {
    return stage.status === "IN_PROGRESS" || stage.status === "BLOCKED" ? 0 : 0;
  }
  return clamp01(stage.completedQuantity / stage.plannedQuantity);
}

export function computeWeightedProgressPercent(stages: StageProgressInput[]): number {
  const applicable = stages.filter((s) => s.isApplicable && s.status !== "SKIPPED");
  if (applicable.length === 0) return 0;
  const totalWeight = applicable.reduce(
    (sum, s) => sum + (s.weight > 0 ? s.weight : ITEM_PRODUCTION_DEFAULT_WEIGHTS[s.stageKey] ?? 10),
    0,
  );
  if (totalWeight <= 0) return 0;
  const weighted = applicable.reduce((sum, s) => {
    const weight = s.weight > 0 ? s.weight : ITEM_PRODUCTION_DEFAULT_WEIGHTS[s.stageKey] ?? 10;
    return sum + stageCompletionRatio(s) * weight;
  }, 0);
  return Math.round(clamp01(weighted / totalWeight) * 10000) / 100;
}

export function deriveReadyQuantity(
  stages: Array<StageProgressInput & { acceptedQuantity?: number }>,
): number {
  const ready = stages.find((s) => s.stageKey === "READY_TO_SHIP" && s.isApplicable);
  if (ready) return Math.max(0, ready.completedQuantity);
  const packing = stages.find((s) => s.stageKey === "PACKING" && s.isApplicable);
  if (packing) return Math.max(0, packing.acceptedQuantity ?? packing.completedQuantity);
  return 0;
}

export function deriveDeliveryStatus(input: {
  readyQuantity: number;
  plannedQuantity: number;
  shippedHint?: boolean;
}): ItemProductionDeliveryStatus {
  const planned = Math.max(0, input.plannedQuantity);
  const ready = Math.max(0, input.readyQuantity);
  if (planned <= 0) return ready > 0 ? "READY" : "NOT_READY";
  if (ready <= 0) return "NOT_READY";
  if (ready >= planned) return input.shippedHint ? "SHIPPED" : "READY";
  return "PARTIALLY_READY";
}

export function deriveCurrentStageKey(
  stages: Array<{
    stageKey: ItemProductionStageKey;
    isApplicable: boolean;
    status: ItemProductionStageStatus;
    sequence: number;
  }>,
): ItemProductionStageKey | null {
  const applicable = [...stages]
    .filter((s) => s.isApplicable && s.status !== "SKIPPED")
    .sort((a, b) => a.sequence - b.sequence);
  const active = applicable.find(
    (s) => s.status === "IN_PROGRESS" || s.status === "BLOCKED" || s.status === "NOT_STARTED",
  );
  if (active) return active.stageKey;
  const lastCompleted = [...applicable].reverse().find((s) => s.status === "COMPLETED");
  return lastCompleted?.stageKey ?? null;
}

export function deriveProductionStatus(input: {
  stages: Array<{ isApplicable: boolean; status: ItemProductionStageStatus }>;
  productionStatus: ItemProductionStatus;
}): ItemProductionStatus {
  if (
    input.productionStatus === "CANCELLED" ||
    input.productionStatus === "ON_HOLD" ||
    input.productionStatus === "DRAFT"
  ) {
    return input.productionStatus;
  }
  const applicable = input.stages.filter((s) => s.isApplicable && s.status !== "SKIPPED");
  if (applicable.length === 0) return input.productionStatus;
  if (applicable.every((s) => s.status === "COMPLETED")) return "COMPLETED";
  if (applicable.some((s) => s.status === "IN_PROGRESS" || s.status === "BLOCKED" || s.status === "COMPLETED")) {
    const finishingKeys = applicable.some(
      (s) =>
        ("stageKey" in s &&
          ((s as { stageKey?: string }).stageKey === "FINISHING" ||
            (s as { stageKey?: string }).stageKey === "IRONING" ||
            (s as { stageKey?: string }).stageKey === "PACKING")) &&
        s.status === "IN_PROGRESS",
    );
    if (finishingKeys) return "FINISHING";
    return "IN_PRODUCTION";
  }
  return "PLANNED";
}

export type RiskInput = {
  promisedDeliveryDate: Date | null;
  progressPercent: number;
  readyQuantity: number;
  plannedQuantity: number;
  lastProgressAt: Date | null;
  productionStatus: ItemProductionStatus;
  hasBlockedStage: boolean;
  hasRejectedOrRework: boolean;
  hasSupplier: boolean;
  hasUnresolvedIssue?: boolean;
  now?: Date;
};

export function computeRiskStatus(input: RiskInput): ItemProductionRiskStatus {
  const now = input.now ?? new Date();
  if (
    input.productionStatus === "CANCELLED" ||
    input.productionStatus === "COMPLETED"
  ) {
    return input.hasBlockedStage ? "BLOCKED" : "ON_TRACK";
  }
  if (input.hasBlockedStage) return "BLOCKED";
  if (input.hasUnresolvedIssue) return "NEEDS_ATTENTION";

  const due = input.promisedDeliveryDate;
  const notReady = input.readyQuantity < Math.max(1, input.plannedQuantity);

  if (due && due.getTime() < now.getTime() && notReady) {
    return "DELAYED";
  }

  if (due) {
    const msLeft = due.getTime() - now.getTime();
    const daysLeft = msLeft / (24 * 60 * 60 * 1000);
    if (daysLeft <= ITEM_PRODUCTION_RISK_CONFIG.atRiskDaysBeforeDue && daysLeft >= 0) {
      const progressRatio = input.progressPercent / 100;
      const readyRatio =
        input.plannedQuantity > 0 ? input.readyQuantity / input.plannedQuantity : 1;
      if (
        progressRatio < ITEM_PRODUCTION_RISK_CONFIG.atRiskBehindProgressRatio ||
        readyRatio < ITEM_PRODUCTION_RISK_CONFIG.atRiskBehindReadyRatio
      ) {
        return "AT_RISK";
      }
    }
  }

  const staleMs =
    ITEM_PRODUCTION_RISK_CONFIG.staleUpdateDays * 24 * 60 * 60 * 1000;
  const last = input.lastProgressAt;
  const started =
    input.productionStatus === "IN_PRODUCTION" ||
    input.productionStatus === "FINISHING" ||
    input.productionStatus === "PLANNED";
  if (started && (!last || now.getTime() - last.getTime() > staleMs)) {
    return "NEEDS_ATTENTION";
  }
  if (input.hasRejectedOrRework) return "NEEDS_ATTENTION";
  if (started && !input.hasSupplier) return "NEEDS_ATTENTION";

  return "ON_TRACK";
}

export function validateQuantityUpdate(input: {
  plannedQuantity: number;
  completedQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
  reworkQuantity: number;
  wasteQuantity: number;
}): string | null {
  const fields = [
    input.completedQuantity,
    input.acceptedQuantity,
    input.rejectedQuantity,
    input.reworkQuantity,
    input.wasteQuantity,
    input.plannedQuantity,
  ];
  if (fields.some((n) => !Number.isFinite(n) || n < 0)) {
    return "Số lượng không được âm.";
  }
  if (input.acceptedQuantity + input.rejectedQuantity > input.completedQuantity) {
    return "Tổng đạt + lỗi không được vượt quá số lượng hoàn thành.";
  }
  if (input.plannedQuantity > 0 && input.completedQuantity > input.plannedQuantity) {
    return "Số lượng hoàn thành không được vượt kế hoạch công đoạn.";
  }
  return null;
}
