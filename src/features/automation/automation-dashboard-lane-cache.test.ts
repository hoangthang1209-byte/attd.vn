import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  needsActiveLaneSeed,
  resolveManualRefreshTargets,
} from "@/features/automation/automation-dashboard-lane-cache";
import type { AutomationDashboardResponse } from "@/features/automation/automation-task.types";

function lanePayload(): AutomationDashboardResponse {
  return {
    configured: true,
    configMessage: null,
    writeActionConfigured: false,
    writeActionConfigMessage: null,
    fetchedAt: "2026-09-23T00:00:00.000Z",
    view: "active",
    productionCommitSha: null,
    productionCheckedAt: null,
    tasks: [],
    summary: {
      totalOpen: { value: 0, isPartial: false },
      building: { value: 0, isPartial: false },
      stalledOrFailed: { value: 0, isPartial: false },
      needsFix: { value: 0, isPartial: false },
      readyToMerge: { value: 0, isPartial: false },
      mergedToday: { value: 0, isPartial: false },
    },
  };
}

describe("automation dashboard lane cache", () => {
  it("requires an active-lane seed after an early switch away from Active", () => {
    assert.equal(needsActiveLaneSeed("all", null), true);
    assert.equal(needsActiveLaneSeed("completed", null), true);
    assert.equal(needsActiveLaneSeed("active", null), false);
    assert.equal(needsActiveLaneSeed("all", lanePayload()), false);
  });

  it("refreshes active lane data during manual refresh on All/Completed", () => {
    assert.deepEqual(resolveManualRefreshTargets("active"), ["active"]);
    assert.deepEqual(resolveManualRefreshTargets("all"), ["all", "active"]);
    assert.deepEqual(resolveManualRefreshTargets("completed"), ["completed", "active"]);
  });

  it("requires lane seed after rapid early switches away from Active", () => {
    assert.equal(needsActiveLaneSeed("completed", null), true);
    assert.equal(needsActiveLaneSeed("all", lanePayload()), false);
  });
});
