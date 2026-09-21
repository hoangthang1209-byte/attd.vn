import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  extractBlockerReason,
  filterRecentStatusComments,
  isMergedToday,
  isOpenAutomationTask,
  parseAutomationRisk,
  parseNormalizedStatus,
  parseTaskArea,
  resolveMergeTimestamp,
  shouldFetchLinkedPullRequest,
  TASK_AREA_UNCLASSIFIED,
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

  it("maps status:queued to its own normalized state", () => {
    assert.deepEqual(parseNormalizedStatus(["status:queued"]), {
      status: "queued",
      statusLabel: "status:queued",
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

  it("prefers PR merge time over issue close time for merge metrics", () => {
    assert.equal(
      resolveMergeTimestamp({
        status: "merged",
        closedAt: "2026-09-19T10:00:00.000Z",
        linkedPullRequestMergedAt: "2026-09-20T08:00:00.000Z",
      }),
      "2026-09-20T08:00:00.000Z",
    );
    assert.equal(
      resolveMergeTimestamp({
        status: "merged",
        closedAt: "2026-09-20T08:00:00.000Z",
        linkedPullRequestMergedAt: null,
      }),
      "2026-09-20T08:00:00.000Z",
    );
    assert.equal(
      resolveMergeTimestamp({
        status: "building",
        closedAt: null,
        linkedPullRequestMergedAt: "2026-09-20T08:00:00.000Z",
      }),
      null,
    );
  });

  it("skips linked PR lookup for closed or terminal tasks", () => {
    assert.equal(shouldFetchLinkedPullRequest("building", true), true);
    assert.equal(shouldFetchLinkedPullRequest("queued", true), true);
    assert.equal(shouldFetchLinkedPullRequest("merged", false), false);
    assert.equal(shouldFetchLinkedPullRequest("merged", true), false);
    assert.equal(shouldFetchLinkedPullRequest("superseded", true), false);
    assert.equal(shouldFetchLinkedPullRequest("ready_to_merge", false), false);
  });

  it("treats merged and superseded issues as not open automation tasks", () => {
    assert.equal(isOpenAutomationTask("merged", true), false);
    assert.equal(isOpenAutomationTask("superseded", true), false);
    assert.equal(isOpenAutomationTask("building", true), true);
    assert.equal(isOpenAutomationTask("queued", true), true);
    assert.equal(isOpenAutomationTask("building", false), false);
  });

  it("parses TASK_AREA from the latest matching comment", () => {
    assert.equal(
      parseTaskArea([
        { author: "owner", body: "TASK_AREA: Lead & Sales", createdAt: "2026-01-01T00:00:00Z" },
        { author: "owner", body: "BUILD_APPROVED", createdAt: "2026-01-01T01:00:00Z" },
        {
          author: "owner",
          body: "TASK_AREA: Public Website UI",
          createdAt: "2026-01-01T02:00:00Z",
        },
      ]),
      "Public Website UI",
    );
  });

  it("returns Chưa phân loại when no TASK_AREA marker exists", () => {
    assert.equal(
      parseTaskArea([
        { author: "owner", body: "BUILD_APPROVED", createdAt: "2026-01-01T00:00:00Z" },
      ]),
      TASK_AREA_UNCLASSIFIED,
    );
    assert.equal(parseTaskArea([]), TASK_AREA_UNCLASSIFIED);
  });

  it("ignores empty TASK_AREA values", () => {
    assert.equal(
      parseTaskArea([
        { author: "owner", body: "TASK_AREA:", createdAt: "2026-01-01T00:00:00Z" },
        { author: "owner", body: "TASK_AREA: Automation Platform", createdAt: "2026-01-01T01:00:00Z" },
      ]),
      "Automation Platform",
    );
  });
});
