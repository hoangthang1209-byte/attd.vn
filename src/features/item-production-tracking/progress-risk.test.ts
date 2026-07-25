import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeRiskStatus,
  computeWeightedProgressPercent,
  deriveReadyQuantity,
  stageCompletionRatio,
  validateQuantityUpdate,
} from "@/features/item-production-tracking/progress-risk";
import type { StageProgressInput } from "@/features/item-production-tracking/progress-risk";

function stage(
  partial: Partial<StageProgressInput> & Pick<StageProgressInput, "stageKey">,
): StageProgressInput {
  return {
    isApplicable: true,
    weight: 10,
    status: "NOT_STARTED",
    plannedQuantity: 100,
    completedQuantity: 0,
    ...partial,
  };
}

describe("item production progress and risk", () => {
  it("computes weighted progress across applicable stages", () => {
    const stages: StageProgressInput[] = [
      stage({ stageKey: "MATERIAL_SYNC", weight: 10, status: "COMPLETED", completedQuantity: 100 }),
      stage({ stageKey: "CUTTING", weight: 10, status: "COMPLETED", completedQuantity: 100 }),
      stage({ stageKey: "SEWING", weight: 30, status: "IN_PROGRESS", completedQuantity: 50 }),
      stage({ stageKey: "WASHING", weight: 10, isApplicable: false }),
      stage({ stageKey: "QC", weight: 15, status: "NOT_STARTED" }),
      stage({ stageKey: "PACKING", weight: 10, status: "NOT_STARTED" }),
      stage({ stageKey: "READY_TO_SHIP", weight: 5, status: "NOT_STARTED" }),
    ];
    // applicable weights: 10+10+30+15+10+5 = 80
    // completed: 10+10+15 = 35 → 35/80 = 43.75
    const pct = computeWeightedProgressPercent(stages);
    assert.equal(pct, 43.75);
  });

  it("treats skipped/not-applicable stages as excluded from progress", () => {
    const stages: StageProgressInput[] = [
      stage({ stageKey: "MATERIAL_SYNC", weight: 10, status: "COMPLETED", completedQuantity: 100 }),
      stage({ stageKey: "PRINT_EMBROIDERY", weight: 15, status: "SKIPPED", isApplicable: false }),
      stage({ stageKey: "READY_TO_SHIP", weight: 5, status: "NOT_STARTED" }),
    ];
    assert.equal(computeWeightedProgressPercent(stages), Math.round((10 / 15) * 10000) / 100);
  });

  it("derives ready quantity from READY_TO_SHIP then PACKING", () => {
    assert.equal(
      deriveReadyQuantity([
        stage({ stageKey: "PACKING", completedQuantity: 40 }),
        stage({ stageKey: "READY_TO_SHIP", completedQuantity: 25 }),
      ]),
      25,
    );
    assert.equal(
      deriveReadyQuantity([stage({ stageKey: "PACKING", completedQuantity: 40 })]),
      40,
    );
  });

  it("validates quantity rules", () => {
    assert.equal(
      validateQuantityUpdate({
        plannedQuantity: 100,
        completedQuantity: 50,
        acceptedQuantity: 40,
        rejectedQuantity: 10,
        reworkQuantity: 0,
        wasteQuantity: 0,
      }),
      null,
    );
    assert.match(
      validateQuantityUpdate({
        plannedQuantity: 100,
        completedQuantity: 50,
        acceptedQuantity: 40,
        rejectedQuantity: 20,
        reworkQuantity: 0,
        wasteQuantity: 0,
      }) ?? "",
      /vượt/,
    );
    assert.match(
      validateQuantityUpdate({
        plannedQuantity: 10,
        completedQuantity: -1,
        acceptedQuantity: 0,
        rejectedQuantity: 0,
        reworkQuantity: 0,
        wasteQuantity: 0,
      }) ?? "",
      /âm/,
    );
  });

  it("marks delayed when due date passed and not ready", () => {
    const risk = computeRiskStatus({
      promisedDeliveryDate: new Date("2020-01-01"),
      progressPercent: 40,
      readyQuantity: 10,
      plannedQuantity: 100,
      lastProgressAt: new Date(),
      productionStatus: "IN_PRODUCTION",
      hasBlockedStage: false,
      hasRejectedOrRework: false,
      hasSupplier: true,
      now: new Date("2026-01-01"),
    });
    assert.equal(risk, "DELAYED");
  });

  it("marks blocked when a stage is blocked", () => {
    const risk = computeRiskStatus({
      promisedDeliveryDate: new Date("2099-01-01"),
      progressPercent: 40,
      readyQuantity: 0,
      plannedQuantity: 100,
      lastProgressAt: new Date(),
      productionStatus: "IN_PRODUCTION",
      hasBlockedStage: true,
      hasRejectedOrRework: false,
      hasSupplier: true,
    });
    assert.equal(risk, "BLOCKED");
  });

  it("marks needs attention for stale updates", () => {
    const risk = computeRiskStatus({
      promisedDeliveryDate: new Date("2099-01-01"),
      progressPercent: 40,
      readyQuantity: 0,
      plannedQuantity: 100,
      lastProgressAt: new Date("2020-01-01"),
      productionStatus: "IN_PRODUCTION",
      hasBlockedStage: false,
      hasRejectedOrRework: false,
      hasSupplier: true,
      now: new Date("2026-01-01"),
    });
    assert.equal(risk, "NEEDS_ATTENTION");
  });

  it("clamps stage completion ratio", () => {
    assert.equal(
      stageCompletionRatio(
        stage({ stageKey: "SEWING", plannedQuantity: 100, completedQuantity: 150, status: "IN_PROGRESS" }),
      ),
      1,
    );
  });

  it("marks at risk near due date with behind progress", () => {
    const now = new Date("2026-07-20T00:00:00Z");
    const due = new Date("2026-07-22T00:00:00Z");
    const risk = computeRiskStatus({
      promisedDeliveryDate: due,
      progressPercent: 20,
      readyQuantity: 5,
      plannedQuantity: 100,
      lastProgressAt: now,
      productionStatus: "IN_PRODUCTION",
      hasBlockedStage: false,
      hasRejectedOrRework: false,
      hasSupplier: true,
      now,
    });
    assert.equal(risk, "AT_RISK");
  });

  it("marks needs attention when supplier missing after production start", () => {
    const risk = computeRiskStatus({
      promisedDeliveryDate: new Date("2099-01-01"),
      progressPercent: 40,
      readyQuantity: 0,
      plannedQuantity: 100,
      lastProgressAt: new Date(),
      productionStatus: "IN_PRODUCTION",
      hasBlockedStage: false,
      hasRejectedOrRework: false,
      hasSupplier: false,
    });
    assert.equal(risk, "NEEDS_ATTENTION");
  });

  it("keeps high progress distinct from partial ready quantity", () => {
    const stages: StageProgressInput[] = [
      stage({ stageKey: "MATERIAL_SYNC", weight: 10, status: "COMPLETED", completedQuantity: 100 }),
      stage({ stageKey: "CUTTING", weight: 10, status: "COMPLETED", completedQuantity: 100 }),
      stage({ stageKey: "SEWING", weight: 30, status: "COMPLETED", completedQuantity: 100 }),
      stage({ stageKey: "QC", weight: 15, status: "COMPLETED", completedQuantity: 100 }),
      stage({ stageKey: "PACKING", weight: 10, status: "IN_PROGRESS", completedQuantity: 30 }),
      stage({ stageKey: "READY_TO_SHIP", weight: 5, status: "NOT_STARTED", completedQuantity: 0 }),
    ];
    assert.ok(computeWeightedProgressPercent(stages) > 80);
    assert.equal(deriveReadyQuantity(stages), 0);
  });

  it("returns 100% when all applicable stages completed", () => {
    const stages: StageProgressInput[] = [
      stage({ stageKey: "MATERIAL_SYNC", weight: 10, status: "COMPLETED", completedQuantity: 100 }),
      stage({ stageKey: "SEWING", weight: 30, status: "COMPLETED", completedQuantity: 100 }),
      stage({ stageKey: "QC", weight: 15, status: "COMPLETED", completedQuantity: 100 }),
      stage({ stageKey: "READY_TO_SHIP", weight: 5, status: "COMPLETED", completedQuantity: 100 }),
    ];
    assert.equal(computeWeightedProgressPercent(stages), 100);
    assert.equal(deriveReadyQuantity(stages), 100);
  });
});
