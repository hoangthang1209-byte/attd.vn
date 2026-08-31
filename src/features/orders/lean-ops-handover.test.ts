import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import {
  isLeanOpsItemBlocked,
  isLeanOpsItemPackingReady,
  mapLeanOpsStageToProductionStageRecord,
  mapLeanOpsTrackingToStages,
  resolveLeanOpsReadyQuantity,
  type LeanOpsStageRow,
  type LeanOpsTrackingRow,
} from "@/features/orders/lean-ops-execution-bridge";
import { computeStageProgressSummary } from "@/features/orders/production-stage.service";
import { evaluateOrderItemReadiness } from "@/features/orders/order-item-readiness";
import type { QcInspectionRecord } from "@/features/orders/qc-inspection.service";

function stage(partial: Partial<LeanOpsStageRow> & Pick<LeanOpsStageRow, "stageKey">): LeanOpsStageRow {
  return {
    id: `stage-${partial.stageKey}`,
    labelSnapshot: partial.stageKey,
    sequence: 10,
    isApplicable: true,
    status: "NOT_STARTED",
    plannedQuantity: 5000,
    completedQuantity: 0,
    acceptedQuantity: 0,
    rejectedQuantity: 0,
    reworkQuantity: 0,
    note: null,
    actualStartAt: null,
    actualEndAt: null,
    ...partial,
  };
}

function tracking(stages: LeanOpsStageRow[], readyQuantity = 0): LeanOpsTrackingRow {
  return {
    id: "tracking-1",
    orderItemId: "item-1",
    readyQuantity,
    stages,
  };
}

function qcPassed(passed = "5000"): QcInspectionRecord {
  return {
    id: "qc-1",
    orderId: "order-1",
    orderItemId: "item-1",
    status: "PASSED",
    statusLabel: "Đạt",
    inspectedByEmployeeId: null,
    inspectedByEmployeeName: null,
    inspectedAt: null,
    inspectedQuantity: passed,
    passedQuantity: passed,
    defectQuantity: "0",
    reworkQuantity: "0",
    scrapQuantity: "0",
    summary: null,
    correctiveAction: null,
    evidence: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

describe("lean ops execution bridge — handover alignment", () => {
  it("maps packing complete so handover summary sees packing complete", () => {
    const leanStages = [
      stage({ stageKey: "SEWING", status: "COMPLETED", completedQuantity: 5000, sequence: 1 }),
      stage({ stageKey: "PACKING", status: "COMPLETED", completedQuantity: 5000, sequence: 2 }),
      stage({ stageKey: "READY_TO_SHIP", status: "COMPLETED", completedQuantity: 5000, sequence: 3 }),
    ];
    assert.equal(isLeanOpsItemPackingReady(leanStages), true);

    const mapped = mapLeanOpsTrackingToStages("order-1", tracking(leanStages));
    const summary = computeStageProgressSummary(mapped);
    assert.equal(summary.packingCompleted, true);
    assert.equal(summary.hasBlocked, false);
  });

  it("uses Lean Ops ready quantity for handover production completed quantity", () => {
    assert.equal(
      resolveLeanOpsReadyQuantity(
        tracking(
          [
            stage({ stageKey: "PACKING", status: "COMPLETED", completedQuantity: 5000, acceptedQuantity: 5000 }),
            stage({ stageKey: "READY_TO_SHIP", status: "COMPLETED", completedQuantity: 5000 }),
          ],
          5000,
        ),
      ),
      5000,
    );

    assert.equal(
      resolveLeanOpsReadyQuantity(
        tracking([
          stage({
            stageKey: "PACKING",
            status: "COMPLETED",
            completedQuantity: 3200,
            acceptedQuantity: 3200,
          }),
          stage({ stageKey: "READY_TO_SHIP", status: "IN_PROGRESS", completedQuantity: 0 }),
        ]),
      ),
      3200,
    );
  });

  it("detects Lean Ops blocked item for handover blocker", () => {
    const leanStages = [
      stage({ stageKey: "SEWING", status: "BLOCKED", completedQuantity: 1000 }),
      stage({ stageKey: "PACKING", status: "NOT_STARTED" }),
    ];
    assert.equal(isLeanOpsItemBlocked(leanStages), true);

    const summary = computeStageProgressSummary(
      mapLeanOpsTrackingToStages("order-1", tracking(leanStages)),
    );
    assert.equal(summary.hasBlocked, true);
  });

  it("supports partial-ready Lean Ops quantities", () => {
    const ready = resolveLeanOpsReadyQuantity(
      tracking(
        [
          stage({
            stageKey: "PACKING",
            status: "IN_PROGRESS",
            completedQuantity: 2500,
            acceptedQuantity: 2500,
          }),
          stage({ stageKey: "READY_TO_SHIP", status: "NOT_STARTED", completedQuantity: 0 }),
        ],
        2500,
      ),
    );
    assert.equal(ready, 2500);
    assert.ok(ready > 0 && ready < 5000);
  });

  it("maps non-applicable Lean Ops stages as SKIPPED for legacy consumers", () => {
    const mapped = mapLeanOpsStageToProductionStageRecord({
      orderId: "order-1",
      orderItemId: "item-1",
      stage: stage({ stageKey: "WASHING", isApplicable: false, status: "NOT_STARTED" }),
    });
    assert.equal(mapped.status, "SKIPPED");
    assert.equal(mapped.stageType, "OTHER");
  });

  it("marks item READY_TO_SHIP when Lean Ops packing + QC passed", () => {
    const stages = mapLeanOpsTrackingToStages(
      "order-1",
      tracking([
        stage({ stageKey: "CUTTING", status: "COMPLETED", completedQuantity: 5000, sequence: 1 }),
        stage({ stageKey: "SEWING", status: "COMPLETED", completedQuantity: 5000, sequence: 2 }),
        stage({ stageKey: "QC", status: "COMPLETED", completedQuantity: 5000, sequence: 3 }),
        stage({ stageKey: "PACKING", status: "COMPLETED", completedQuantity: 5000, sequence: 4 }),
      ]),
    );
    const readiness = evaluateOrderItemReadiness({
      supplySource: "MADE_TO_ORDER",
      processingMethod: "MADE_TO_ORDER",
      orderedQuantity: 5000,
      stages,
      qc: qcPassed("5000"),
      activeFileCount: 1,
      hasDesignFile: true,
    });
    assert.equal(readiness.state, "READY_TO_SHIP");
  });

  it("keeps QC readiness enforced when packing is done but QC missing", () => {
    const stages = mapLeanOpsTrackingToStages(
      "order-1",
      tracking([
        stage({ stageKey: "SEWING", status: "COMPLETED", completedQuantity: 5000, sequence: 1 }),
        stage({ stageKey: "PACKING", status: "COMPLETED", completedQuantity: 5000, sequence: 2 }),
      ]),
    );
    const readiness = evaluateOrderItemReadiness({
      supplySource: "MADE_TO_ORDER",
      processingMethod: "MADE_TO_ORDER",
      orderedQuantity: 5000,
      stages,
      qc: null,
      activeFileCount: 1,
      hasDesignFile: true,
    });
    assert.equal(readiness.state, "AWAITING_QC");
  });

  it("reports packing incomplete when Lean Ops packing not done", () => {
    const leanStages = [
      stage({ stageKey: "SEWING", status: "COMPLETED", completedQuantity: 5000 }),
      stage({ stageKey: "PACKING", status: "IN_PROGRESS", completedQuantity: 1000 }),
    ];
    assert.equal(isLeanOpsItemPackingReady(leanStages), false);
    const summary = computeStageProgressSummary(
      mapLeanOpsTrackingToStages("order-1", tracking(leanStages)),
    );
    assert.equal(summary.packingCompleted, false);
  });
});

describe("lean ops handover wiring contracts", () => {
  it("production execution prefers ItemProductionTracking when present", () => {
    const src = readFileSync("src/features/orders/production-execution.service.ts", "utf8");
    assert.match(src, /loadLeanOpsTrackingsForOrder/);
    assert.match(src, /usesLeanOps/);
    assert.match(src, /Do not seed competing OrderProductionStage/);
  });

  it("order IN_PRODUCTION skips legacy stage init when Lean Ops exists", () => {
    const src = readFileSync("src/features/orders/order.service.ts", "utf8");
    assert.match(src, /itemProductionTracking\.count/);
    assert.match(src, /leanOpsCount === 0/);
  });

  it("handover uses Lean Ops ready quantity", () => {
    const src = readFileSync("src/features/orders/handover-readiness.service.ts", "utf8");
    assert.match(src, /leanOpsReadyQuantity/);
    assert.match(src, /bundle\.usesLeanOps/);
  });
});
