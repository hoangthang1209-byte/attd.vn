import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import {
  computeWeightedProgressPercent,
  isNextActionOverdue,
  stageCompletionRatio,
  validateQuantityUpdate,
  computeRiskStatus,
} from "@/features/item-production-tracking/progress-risk";
import { sortByExceptionFirst } from "@/features/item-production-tracking/lean-ops";
import { ITEM_PRODUCTION_SAMPLE_STATUS_LABELS } from "@/features/item-production-tracking/labels";
import { resolveOrderItemTotalQuantity } from "@/features/orders/bom-calculations";

describe("bigbang ops fit — next action", () => {
  it("detects overdue nextAction without marking DELAYED", () => {
    const now = new Date("2026-09-05T12:00:00Z");
    assert.equal(isNextActionOverdue("Chốt màu wash", "2026-09-02", now), true);
    assert.equal(isNextActionOverdue("Chốt màu wash", "2026-09-10", now), false);
    assert.equal(isNextActionOverdue(null, "2026-09-02", now), false);
    assert.equal(isNextActionOverdue("  ", "2026-09-02", now), false);

    const risk = computeRiskStatus({
      promisedDeliveryDate: new Date("2026-12-01"),
      progressPercent: 40,
      readyQuantity: 0,
      plannedQuantity: 550,
      lastProgressAt: now,
      productionStatus: "IN_PRODUCTION",
      hasBlockedStage: false,
      hasRejectedOrRework: false,
      hasSupplier: true,
      hasOverdueNextAction: true,
      now,
    });
    assert.equal(risk, "NEEDS_ATTENTION");
  });

  it("sorts overdue nextAction after blockers and before generic attention peers by deadline", () => {
    const now = new Date("2026-09-05");
    const sorted = sortByExceptionFirst(
      [
        {
          id: "normal",
          riskStatus: "ON_TRACK",
          promisedDeliveryDate: "2026-10-01",
          openIssueCount: 0,
          nextAction: null,
          nextActionDueDate: null,
        },
        {
          id: "overdue-action",
          riskStatus: "NEEDS_ATTENTION",
          promisedDeliveryDate: "2026-10-20",
          openIssueCount: 0,
          nextAction: "Chốt màu wash với khách",
          nextActionDueDate: "2026-09-02",
        },
        {
          id: "has-issue",
          riskStatus: "NEEDS_ATTENTION",
          promisedDeliveryDate: "2026-10-15",
          openIssueCount: 1,
          nextAction: null,
          nextActionDueDate: null,
        },
        {
          id: "delayed",
          riskStatus: "DELAYED",
          promisedDeliveryDate: "2026-08-01",
          openIssueCount: 0,
        },
      ],
      now,
    );
    assert.deepEqual(
      sorted.map((s) => s.id),
      ["delayed", "has-issue", "overdue-action", "normal"],
    );
  });
});

describe("bigbang ops fit — sample revision", () => {
  it("exposes NEEDS_REVISION label", () => {
    assert.equal(ITEM_PRODUCTION_SAMPLE_STATUS_LABELS.NEEDS_REVISION, "Cần chỉnh mẫu");
  });
});

describe("bigbang ops fit — quantity over ordered", () => {
  it("preserves completed quantity above planned and rejects negatives only", () => {
    assert.equal(
      validateQuantityUpdate({
        plannedQuantity: 750,
        completedQuantity: 780,
        acceptedQuantity: 760,
        rejectedQuantity: 20,
        reworkQuantity: 0,
        wasteQuantity: 0,
      }),
      null,
    );
    assert.match(
      validateQuantityUpdate({
        plannedQuantity: 750,
        completedQuantity: -1,
        acceptedQuantity: 0,
        rejectedQuantity: 0,
        reworkQuantity: 0,
        wasteQuantity: 0,
      }) ?? "",
      /âm/,
    );
  });

  it("caps progress contribution at 100% when completed exceeds planned", () => {
    assert.equal(
      stageCompletionRatio({
        stageKey: "CUTTING",
        isApplicable: true,
        weight: 10,
        status: "IN_PROGRESS",
        plannedQuantity: 750,
        completedQuantity: 780,
      }),
      1,
    );
    const pct = computeWeightedProgressPercent([
      {
        stageKey: "CUTTING",
        isApplicable: true,
        weight: 10,
        status: "COMPLETED",
        plannedQuantity: 750,
        completedQuantity: 780,
      },
      {
        stageKey: "SEWING",
        isApplicable: true,
        weight: 10,
        status: "NOT_STARTED",
        plannedQuantity: 750,
        completedQuantity: 0,
      },
    ]);
    assert.equal(pct, 50);
    assert.ok(pct <= 100);
  });
});

describe("bigbang ops fit — one tracking per OrderItem / workflow", () => {
  it("rolls variant quantities into a single OrderItem total", () => {
    const total = resolveOrderItemTotalQuantity({
      quantity: 0,
      variants: [
        { quantity: 100 },
        { quantity: 200 },
        { quantity: 450 },
      ],
    });
    assert.equal(total, 750);
  });

  it("initialize supports per-item workflow mapping and unique orderItemId", () => {
    const service = readFileSync("src/features/item-production-tracking/item-production.service.ts", "utf8");
    assert.match(service, /templateIdByOrderItemId/);
    assert.match(service, /resolveOrderItemTotalQuantity/);
    assert.match(service, /orderItemId: item\.id/);
    assert.match(service, /One tracking row per OrderItem/);
    const schema = readFileSync("prisma/schema.prisma", "utf8");
    assert.match(schema, /orderItemId\s+String\s+@unique/);
    assert.match(schema, /nextAction\s+String\?/);
    assert.match(schema, /NEEDS_REVISION/);
  });

  it("keeps lean ops handover bridge intact", () => {
    const bridge = readFileSync("src/features/orders/lean-ops-execution-bridge.ts", "utf8");
    assert.match(bridge, /loadLeanOpsTrackingsForOrder/);
    const handover = readFileSync("src/features/orders/handover-readiness.service.ts", "utf8");
    assert.match(handover, /bundle\.usesLeanOps/);
  });
});
