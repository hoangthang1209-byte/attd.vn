import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sortByExceptionFirst } from "@/features/item-production-tracking/lean-ops";
import { computeRiskStatus } from "@/features/item-production-tracking/progress-risk";

describe("production lean ops", () => {
  it("sorts items exception-first by risk then deadline", () => {
    const sorted = sortByExceptionFirst([
      {
        id: "a",
        riskStatus: "ON_TRACK",
        promisedDeliveryDate: "2026-10-01",
        openIssueCount: 0,
      },
      {
        id: "b",
        riskStatus: "DELAYED",
        promisedDeliveryDate: "2026-09-01",
        openIssueCount: 0,
      },
      {
        id: "c",
        riskStatus: "AT_RISK",
        promisedDeliveryDate: "2026-09-15",
        openIssueCount: 1,
      },
    ]);
    assert.deepEqual(sorted.map((s) => s.id), ["b", "c", "a"]);
  });

  it("flags NEEDS_ATTENTION when unresolved issue exists", () => {
    const risk = computeRiskStatus({
      promisedDeliveryDate: new Date("2026-12-01"),
      progressPercent: 50,
      readyQuantity: 100,
      plannedQuantity: 1000,
      lastProgressAt: new Date(),
      productionStatus: "IN_PRODUCTION",
      hasBlockedStage: false,
      hasRejectedOrRework: false,
      hasSupplier: true,
      hasUnresolvedIssue: true,
    });
    assert.equal(risk, "NEEDS_ATTENTION");
  });

  it("keeps ON_TRACK when no issues and on schedule", () => {
    const risk = computeRiskStatus({
      promisedDeliveryDate: new Date("2026-12-01"),
      progressPercent: 80,
      readyQuantity: 800,
      plannedQuantity: 1000,
      lastProgressAt: new Date(),
      productionStatus: "IN_PRODUCTION",
      hasBlockedStage: false,
      hasRejectedOrRework: false,
      hasSupplier: true,
      hasUnresolvedIssue: false,
    });
    assert.equal(risk, "ON_TRACK");
  });

  it("flags NEEDS_ATTENTION for overdue next action", () => {
    const risk = computeRiskStatus({
      promisedDeliveryDate: new Date("2026-12-01"),
      progressPercent: 40,
      readyQuantity: 0,
      plannedQuantity: 550,
      lastProgressAt: new Date(),
      productionStatus: "IN_PRODUCTION",
      hasBlockedStage: false,
      hasRejectedOrRework: false,
      hasSupplier: true,
      hasOverdueNextAction: true,
    });
    assert.equal(risk, "NEEDS_ATTENTION");
  });
});
