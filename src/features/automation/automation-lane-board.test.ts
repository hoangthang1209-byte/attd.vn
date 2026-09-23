import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveCanonicalLaneId } from "@/features/automation/automation-lane.constants";
import {
  AUTOMATION_LANE_OVERALL_STATE_LABELS,
  buildLaneBoard,
  buildLaneBoardSummary,
  deriveLaneNextAction,
  formatLaneCiReview,
  mapLaneOverallState,
  selectLaneApprovalTask,
  selectLaneRepresentativeTask,
} from "@/features/automation/automation-lane-board";
import type { AutomationTask } from "@/features/automation/automation-task.types";

function taskFixture(overrides: Partial<AutomationTask> = {}): AutomationTask {
  return {
    issueNumber: 83,
    title: "Automation dashboard task area",
    taskArea: "Automation Platform",
    status: "building",
    statusLabel: "status:building",
    risk: "low",
    riskLabel: "risk:low",
    linkedPullRequest: null,
    latestUpdateAt: "2026-09-21T00:00:00.000Z",
    closedAt: null,
    mergedAt: null,
    blockerReason: null,
    isOpen: true,
    githubIssueUrl: "https://github.com/hoangthang1209-byte/attd.vn/issues/83",
    labels: ["status:building", "risk:low"],
    recentStatusComments: [],
    hasBuildApproved: false,
    productionStatus: {
      status: "unknown",
      mergedCommitSha: null,
      reason: null,
      checkedAt: "2026-09-21T00:00:00.000Z",
    },
    ...overrides,
  };
}

describe("automation lane constants", () => {
  it("maps known aliases to canonical lanes", () => {
    assert.equal(resolveCanonicalLaneId("Lead & Sales"), "lead-sales-crm");
    assert.equal(resolveCanonicalLaneId("Lead & Sales / CRM"), "lead-sales-crm");
    assert.equal(resolveCanonicalLaneId("Marketing / Content / SEO"), "marketing-content-seo");
    assert.equal(resolveCanonicalLaneId("Order & Production Operations"), "order-production-operations");
    assert.equal(resolveCanonicalLaneId("Chưa phân loại"), null);
  });
});

describe("automation lane board", () => {
  it("always renders all seven canonical lanes", () => {
    const board = buildLaneBoard([]);
    assert.equal(board.length, 7);
    assert.deepEqual(
      board.map((entry) => entry.laneLabel),
      [
        "Lead & Sales / CRM",
        "Public Website UI",
        "Automation Platform",
        "Marketing / Content / SEO",
        "Quotation / Quote Builder",
        "Internal Admin Mobile UX",
        "Order & Production Operations",
      ],
    );
    assert.ok(board.every((entry) => entry.overallState === "chua_co_task"));
  });

  it("surfaces repair issues awaiting approval even when another task is in-flight", () => {
    const building = taskFixture({
      issueNumber: 100,
      status: "building",
      latestUpdateAt: "2026-09-22T10:00:00.000Z",
    });
    const repairAwaitingApproval = taskFixture({
      issueNumber: 118,
      status: "backlog",
      labels: ["status:backlog", "orchestrator:review-repair"],
      latestUpdateAt: "2026-09-23T02:00:00.000Z",
    });

    const representative = selectLaneRepresentativeTask([building, repairAwaitingApproval]);
    assert.equal(representative?.issueNumber, 100);

    const approvalTask = selectLaneApprovalTask([building, repairAwaitingApproval]);
    assert.equal(approvalTask?.issueNumber, 118);
  });

  it("includes approvalTask on lane board entries", () => {
    const building = taskFixture({
      issueNumber: 100,
      status: "building",
      latestUpdateAt: "2026-09-22T10:00:00.000Z",
    });
    const repairAwaitingApproval = taskFixture({
      issueNumber: 118,
      status: "backlog",
      labels: ["status:backlog", "orchestrator:review-repair"],
      latestUpdateAt: "2026-09-23T02:00:00.000Z",
    });

    const board = buildLaneBoard([building, repairAwaitingApproval]);
    const automationLane = board.find((entry) => entry.laneId === "automation-platform");
    assert.equal(automationLane?.task?.issueNumber, 100);
    assert.equal(automationLane?.approvalTask?.issueNumber, 118);
  });

  it("prefers higher-priority open tasks when multiple exist in a lane", () => {
    const building = taskFixture({
      issueNumber: 100,
      status: "building",
      latestUpdateAt: "2026-09-22T10:00:00.000Z",
    });
    const needsFix = taskFixture({
      issueNumber: 101,
      status: "needs_fix",
      latestUpdateAt: "2026-09-21T10:00:00.000Z",
    });
    const stalled = taskFixture({
      issueNumber: 102,
      status: "stalled",
      latestUpdateAt: "2026-09-20T10:00:00.000Z",
    });

    const selected = selectLaneRepresentativeTask([building, needsFix, stalled]);
    assert.equal(selected?.issueNumber, 102);

    const selectedNeedsFix = selectLaneRepresentativeTask([building, needsFix]);
    assert.equal(selectedNeedsFix?.issueNumber, 101);
  });

  it("falls back to the most recent completed task when no open task exists", () => {
    const olderMerged = taskFixture({
      issueNumber: 90,
      isOpen: false,
      status: "merged",
      mergedAt: "2026-09-10T00:00:00.000Z",
      latestUpdateAt: "2026-09-10T00:00:00.000Z",
      productionStatus: {
        status: "live",
        mergedCommitSha: "abc123",
        reason: null,
        checkedAt: "2026-09-10T00:00:00.000Z",
      },
    });
    const newerMerged = taskFixture({
      issueNumber: 91,
      isOpen: false,
      status: "merged",
      mergedAt: "2026-09-20T00:00:00.000Z",
      latestUpdateAt: "2026-09-20T00:00:00.000Z",
      productionStatus: {
        status: "deploying",
        mergedCommitSha: "def456",
        reason: null,
        checkedAt: "2026-09-20T00:00:00.000Z",
      },
    });

    const selected = selectLaneRepresentativeTask([olderMerged, newerMerged]);
    assert.equal(selected?.issueNumber, 91);
  });

  it("maps overall lane states from task truth", () => {
    assert.equal(mapLaneOverallState(taskFixture({ status: "building" })), "dang_build");
    assert.equal(mapLaneOverallState(taskFixture({ status: "ci_review" })), "dang_kiem_tra");
    assert.equal(mapLaneOverallState(taskFixture({ status: "needs_fix" })), "can_sua");
    assert.equal(mapLaneOverallState(taskFixture({ status: "ready_to_merge" })), "san_sang_merge");
    assert.equal(
      mapLaneOverallState(
        taskFixture({
          status: "merged",
          isOpen: false,
          productionStatus: {
            status: "live",
            mergedCommitSha: "abc",
            reason: null,
            checkedAt: "2026-09-21T00:00:00.000Z",
          },
        }),
      ),
      "production",
    );
    assert.equal(mapLaneOverallState(null), "chua_co_task");
  });

  it("derives concise next actions", () => {
    assert.equal(
      deriveLaneNextAction(taskFixture({ status: "building" }), "dang_build"),
      "Chờ Builder",
    );
    assert.equal(
      deriveLaneNextAction(taskFixture({ status: "ready_to_merge" }), "san_sang_merge"),
      "Merge",
    );
    assert.equal(
      deriveLaneNextAction(
        taskFixture({ status: "blocked", blockerReason: "Thiếu BUILD_APPROVED" }),
        "blocked",
      ),
      "Thiếu BUILD_APPROVED",
    );
    assert.equal(deriveLaneNextAction(null, "chua_co_task"), "—");
  });

  it("formats CI/review display from structured status", () => {
    assert.equal(formatLaneCiReview(taskFixture({ status: "ready_to_merge" })), "CI ✅ · Review ✅");
    assert.equal(formatLaneCiReview(taskFixture({ status: "needs_fix" })), "CI ❌ · cần sửa");
    assert.equal(formatLaneCiReview(null), "—");
  });

  it("builds summary counts from lane aggregation", () => {
    const board = buildLaneBoard([
      taskFixture({ taskArea: "Automation Platform", status: "building" }),
      taskFixture({
        issueNumber: 71,
        taskArea: "Lead & Sales",
        status: "needs_fix",
      }),
      taskFixture({
        issueNumber: 99,
        taskArea: "Marketing / Content / SEO",
        status: "merged",
        isOpen: false,
        productionStatus: {
          status: "live",
          mergedCommitSha: "abc",
          reason: null,
          checkedAt: "2026-09-21T00:00:00.000Z",
        },
      }),
    ]);

    const summary = buildLaneBoardSummary(board);
    assert.equal(summary.totalLanes, 7);
    assert.equal(summary.runningCount, 1);
    assert.equal(summary.blockedOrNeedsFixCount, 1);
    assert.equal(summary.productionCount, 1);

    const automationLane = board.find((entry) => entry.laneId === "automation-platform");
    assert.equal(automationLane?.overallStateLabel, AUTOMATION_LANE_OVERALL_STATE_LABELS.dang_build);
  });
});
