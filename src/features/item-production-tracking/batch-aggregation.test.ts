import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeAllocatedQuantity,
  computeParentRollupFromBatches,
  computeUnallocatedQuantity,
  generateBatchCode,
  hasMaterialItemProgress,
  recomputeBatchFromStages,
} from "@/features/item-production-tracking/batch-aggregation";
import type { StageProgressInput } from "@/features/item-production-tracking/progress-risk";

function stage(partial: Partial<StageProgressInput> & Pick<StageProgressInput, "stageKey">): StageProgressInput {
  return {
    isApplicable: true,
    weight: 10,
    status: "NOT_STARTED",
    plannedQuantity: 100,
    completedQuantity: 0,
    ...partial,
  };
}

describe("batch aggregation", () => {
  it("computes allocated and unallocated quantities", () => {
    const batches = [
      { status: "ACTIVE" as const, plannedQuantity: 1000 },
      { status: "DRAFT" as const, plannedQuantity: 500 },
      { status: "CANCELLED" as const, plannedQuantity: 200 },
    ];
    assert.equal(computeAllocatedQuantity(batches), 1500);
    assert.equal(computeUnallocatedQuantity(2000, batches), 500);
  });

  it("ignores cancelled batches in allocation", () => {
    const batches = [{ status: "CANCELLED" as const, plannedQuantity: 500 }];
    assert.equal(computeAllocatedQuantity(batches), 0);
    assert.equal(computeUnallocatedQuantity(1000, batches), 1000);
  });

  it("rolls up parent progress quantity-weighted across active batches", () => {
    const rollup = computeParentRollupFromBatches({
      parentPlannedQuantity: 2000,
      promisedDeliveryDate: null,
      batches: [
        {
          id: "a",
          status: "ACTIVE",
          plannedQuantity: 1000,
          progressPercent: 50,
          readyQuantity: 200,
          riskStatus: "ON_TRACK",
          supplierId: "s1",
          lastProgressAt: null,
          actualStartAt: null,
          actualEndAt: null,
          plannedEndAt: null,
          stages: [stage({ stageKey: "SEWING", status: "IN_PROGRESS", completedQuantity: 50 })],
        },
        {
          id: "b",
          status: "ACTIVE",
          plannedQuantity: 500,
          progressPercent: 100,
          readyQuantity: 500,
          riskStatus: "DELAYED",
          supplierId: "s2",
          lastProgressAt: null,
          actualStartAt: null,
          actualEndAt: null,
          plannedEndAt: null,
          stages: [stage({ stageKey: "READY_TO_SHIP", status: "COMPLETED", completedQuantity: 500 })],
        },
      ],
    });
    assert.equal(rollup.progressPercent, 66.67);
    assert.equal(rollup.readyQuantity, 700);
    assert.equal(rollup.riskStatus, "DELAYED");
    assert.equal(rollup.allocatedQuantity, 1500);
    assert.equal(rollup.unallocatedQuantity, 500);
    assert.equal(rollup.supplierCount, 2);
    assert.equal(rollup.usesBatchExecution, true);
  });

  it("detects material item-level progress blocking batch split", () => {
    assert.equal(
      hasMaterialItemProgress([
        { isApplicable: true, status: "NOT_STARTED", completedQuantity: 0, acceptedQuantity: 0 },
      ]),
      false,
    );
    assert.equal(
      hasMaterialItemProgress([
        { isApplicable: true, status: "IN_PROGRESS", completedQuantity: 10, acceptedQuantity: 0 },
      ]),
      true,
    );
  });

  it("generates readable batch codes", () => {
    assert.match(generateBatchCode("clxyz123abc", 1), /^POI-[A-Z0-9]{6}-B01$/);
    assert.match(generateBatchCode("clxyz123abc", 12), /^POI-[A-Z0-9]{6}-B12$/);
  });

  it("recomputes batch metrics from stages", () => {
    const result = recomputeBatchFromStages(
      [
        stage({ stageKey: "CUTTING", status: "COMPLETED", completedQuantity: 100 }),
        stage({ stageKey: "READY_TO_SHIP", status: "NOT_STARTED", completedQuantity: 0 }),
      ],
      {
        promisedDeliveryDate: null,
        lastProgressAt: new Date(),
        hasSupplier: true,
        batchStatus: "ACTIVE",
      },
    );
    assert.ok(result.progressPercent > 0);
    assert.equal(result.readyQuantity, 0);
  });

  it("handles zero active batches safely", () => {
    const rollup = computeParentRollupFromBatches({
      parentPlannedQuantity: 1000,
      promisedDeliveryDate: null,
      batches: [],
    });
    assert.equal(rollup.progressPercent, 0);
    assert.equal(rollup.readyQuantity, 0);
    assert.equal(rollup.hasBatches, false);
  });
});
