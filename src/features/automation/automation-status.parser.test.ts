import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  extractBlockerReason,
  filterRecentStatusComments,
  isMergedToday,
  isOpenAutomationTask,
  parseAutomationRisk,
  parseNormalizedStatus,
} from "@/features/automation/automation-status.parser";

describe("automation status parser", () => {
  it("maps F1 status labels to normalized statuses", () => {
    assert.deepEqual(parseNormalizedStatus(["status:approved", "risk:low"]), {
      status: "approved",
      statusLabel: "status:approved",
    });
    assert.deepEqual(parseNormalizedStatus(["status:ready-to-merge"]), {
      status: "ready_to_merge",
      statusLabel: "status:ready-to-merge",
    });
    assert.deepEqual(parseNormalizedStatus(["status:ci-failed"]), {
      status: "needs_fix",
      statusLabel: "status:ci-failed",
    });
  });

  it("defaults to backlog when no status label exists", () => {
    assert.deepEqual(parseNormalizedStatus(["risk:medium"]), {
      status: "backlog",
      statusLabel: null,
    });
  });

  it("parses risk labels", () => {
    assert.deepEqual(parseAutomationRisk(["status:approved", "risk:high"]), {
      risk: "high",
      riskLabel: "risk:high",
    });
    assert.deepEqual(parseAutomationRisk(["status:approved"]), {
      risk: "unknown",
      riskLabel: null,
    });
  });

  it("extracts the latest blocker comment", () => {
    const blocker = extractBlockerReason([
      { author: "bot", body: "BUILD_APPROVED", createdAt: "2026-01-01T00:00:00Z" },
      {
        author: "github-actions[bot]",
        body: "TASK_STALLED: No linked PR was created within 45 minutes after BUILD_APPROVED.",
        createdAt: "2026-01-01T01:00:00Z",
      },
    ]);
    assert.match(blocker ?? "", /^TASK_STALLED:/);
  });

  it("filters recent status comments", () => {
    const comments = filterRecentStatusComments([
      { author: "owner", body: "BUILD_APPROVED", createdAt: "2026-01-01T00:00:00Z" },
      { author: "bot", body: "random note", createdAt: "2026-01-01T00:05:00Z" },
      {
        author: "bot",
        body: "ORCHESTRATOR_BLOCKED: P0/P1 findings require human attention before auto-repair.",
        createdAt: "2026-01-01T00:10:00Z",
      },
    ]);
    assert.equal(comments.length, 2);
    assert.equal(comments[1]?.body.startsWith("ORCHESTRATOR_BLOCKED:"), true);
  });

  it("detects merged today using UTC date", () => {
    const now = new Date("2026-09-20T18:00:00.000Z");
    assert.equal(isMergedToday("2026-09-20T08:30:00.000Z", now), true);
    assert.equal(isMergedToday("2026-09-19T23:59:59.000Z", now), false);
  });

  it("treats merged and superseded issues as not open automation tasks", () => {
    assert.equal(isOpenAutomationTask("merged", true), false);
    assert.equal(isOpenAutomationTask("superseded", true), false);
    assert.equal(isOpenAutomationTask("building", true), true);
    assert.equal(isOpenAutomationTask("building", false), false);
  });
});
