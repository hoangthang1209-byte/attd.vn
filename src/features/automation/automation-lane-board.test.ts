import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveCanonicalLaneId } from "@/features/automation/automation-lane.constants";
import {
  AUTOMATION_LANE_OVERALL_STATE_LABELS,
  buildLaneBoard,
  buildLaneBoardSummary,
  deriveLaneNextAction,
  filterCurrentChainOpenTasks,
  formatLaneCiReview,
  isLaneProductionOrComplete,
  mapLaneOverallState,
  prepareLaneBoardTasks,
  resolveLaneOverallStateLabel,
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

  it("returns null for normal backlog approval when another task is actively building", () => {
    const building = taskFixture({
      issueNumber: 100,
      status: "building",
      latestUpdateAt: "2026-09-22T10:00:00.000Z",
    });
    const backlogAwaitingApproval = taskFixture({
      issueNumber: 120,
      status: "backlog",
      labels: ["status:backlog", "risk:low"],
      latestUpdateAt: "2026-09-23T02:00:00.000Z",
    });

    assert.equal(selectLaneApprovalTask([building, backlogAwaitingApproval]), null);
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
    assert.equal(representative?.issueNumber, 118);

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
    assert.equal(automationLane?.task?.issueNumber, 118);
    assert.equal(automationLane?.approvalTask?.issueNumber, 118);
  });

  it("prefers higher-priority blocking tasks within the current chain", () => {
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

  it("prefers the newest open chain over stale superseded pr-open work (CRM #71 vs #95)", () => {
    const stale = taskFixture({
      issueNumber: 71,
      taskArea: "Lead & Sales / CRM",
      status: "pr_open",
      statusLabel: "status:pr-open",
      latestUpdateAt: "2026-08-01T00:00:00.000Z",
    });
    const current = taskFixture({
      issueNumber: 95,
      taskArea: "Lead & Sales / CRM",
      status: "building",
      latestUpdateAt: "2026-09-20T00:00:00.000Z",
    });

    assert.equal(selectLaneRepresentativeTask([stale, current])?.issueNumber, 95);
    assert.deepEqual(filterCurrentChainOpenTasks([stale, current]).map((task) => task.issueNumber), [95]);
  });

  it("prefers the newest automation repair chain over stale pr-open work (#87/#111/#113)", () => {
    const stale = taskFixture({
      issueNumber: 87,
      status: "pr_open",
      statusLabel: "status:pr-open",
      latestUpdateAt: "2026-08-01T00:00:00.000Z",
    });
    const midChain = taskFixture({
      issueNumber: 111,
      status: "merged",
      isOpen: false,
      mergedAt: "2026-09-18T00:00:00.000Z",
      latestUpdateAt: "2026-09-18T00:00:00.000Z",
    });
    const current = taskFixture({
      issueNumber: 113,
      status: "backlog",
      statusLabel: "status:backlog",
      hasBuildApproved: true,
      latestUpdateAt: "2026-09-23T00:00:00.000Z",
    });

    assert.equal(selectLaneRepresentativeTask([stale, midChain, current])?.issueNumber, 113);
  });

  it("prefers the newest mobile repair over older pr-open work (#106 vs #107)", () => {
    const stale = taskFixture({
      issueNumber: 106,
      taskArea: "Internal Admin Mobile UX",
      status: "pr_open",
      statusLabel: "status:pr-open",
      latestUpdateAt: "2026-09-10T00:00:00.000Z",
    });
    const current = taskFixture({
      issueNumber: 107,
      taskArea: "Internal Admin Mobile UX",
      status: "needs_fix",
      latestUpdateAt: "2026-09-22T00:00:00.000Z",
    });

    assert.equal(selectLaneRepresentativeTask([stale, current])?.issueNumber, 107);
  });

  it("uses merged SEO fallback when no open task exists (#100)", () => {
    const merged = taskFixture({
      issueNumber: 100,
      taskArea: "Marketing / Content / SEO",
      status: "merged",
      isOpen: false,
      mergedAt: "2026-09-15T00:00:00.000Z",
      latestUpdateAt: "2026-09-15T00:00:00.000Z",
      productionStatus: {
        status: "live",
        mergedCommitSha: "abc123",
        reason: null,
        checkedAt: "2026-09-15T00:00:00.000Z",
      },
    });

    const board = buildLaneBoard([merged]);
    const seoLane = board.find((entry) => entry.laneId === "marketing-content-seo");
    assert.equal(seoLane?.task?.issueNumber, 100);
    assert.equal(seoLane?.overallState, "production");
  });

  it("represents order/production repair over queued successor (#105/#108/#110/#109)", () => {
    const tasks = [
      taskFixture({
        issueNumber: 105,
        taskArea: "Order & Production Operations",
        status: "merged",
        isOpen: false,
        mergedAt: "2026-09-01T00:00:00.000Z",
        latestUpdateAt: "2026-09-01T00:00:00.000Z",
      }),
      taskFixture({
        issueNumber: 108,
        taskArea: "Order & Production Operations",
        status: "pr_open",
        statusLabel: "status:pr-open",
        latestUpdateAt: "2026-09-10T00:00:00.000Z",
      }),
      taskFixture({
        issueNumber: 109,
        taskArea: "Order & Production Operations",
        status: "queued",
        statusLabel: "status:queued",
        latestUpdateAt: "2026-09-12T00:00:00.000Z",
      }),
      taskFixture({
        issueNumber: 110,
        taskArea: "Order & Production Operations",
        status: "needs_fix",
        latestUpdateAt: "2026-09-20T00:00:00.000Z",
      }),
    ];

    assert.equal(selectLaneRepresentativeTask(tasks)?.issueNumber, 110);
  });

  it("prefers successful merged tasks over closed failed tasks in fallback", () => {
    const failedClosed = taskFixture({
      issueNumber: 95,
      isOpen: false,
      status: "failed",
      latestUpdateAt: "2026-09-22T00:00:00.000Z",
    });
    const merged = taskFixture({
      issueNumber: 94,
      isOpen: false,
      status: "merged",
      mergedAt: "2026-09-15T00:00:00.000Z",
      latestUpdateAt: "2026-09-15T00:00:00.000Z",
      productionStatus: {
        status: "live",
        mergedCommitSha: "abc123",
        reason: null,
        checkedAt: "2026-09-15T00:00:00.000Z",
      },
    });

    const selected = selectLaneRepresentativeTask([failedClosed, merged]);
    assert.equal(selected?.issueNumber, 94);
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

  it("labels BUILD_APPROVED backlog work as approved build state", () => {
    const approvedRepair = taskFixture({
      issueNumber: 113,
      status: "backlog",
      hasBuildApproved: true,
      latestUpdateAt: "2026-09-23T00:00:00.000Z",
    });

    const overallState = mapLaneOverallState(approvedRepair);
    assert.equal(overallState, "dang_build");
    assert.equal(resolveLaneOverallStateLabel(approvedRepair, overallState), "Đã duyệt build");
    assert.equal(deriveLaneNextAction(approvedRepair, overallState), "Chờ Builder");
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

  it("formats CI/review display without raw status labels", () => {
    assert.equal(formatLaneCiReview(taskFixture({ status: "ready_to_merge" })), "CI ✅ · Review ✅");
    assert.equal(formatLaneCiReview(taskFixture({ status: "needs_fix" })), "CI ❌ · cần sửa");
    assert.equal(
      formatLaneCiReview(
        taskFixture({
          status: "pr_open",
          statusLabel: "status:pr-open",
          linkedPullRequest: {
            number: 98,
            url: "https://github.com/hoangthang1209-byte/attd.vn/pull/98",
            state: "open",
            merged: false,
            title: "Public UI",
            updatedAt: "2026-09-20T00:00:00.000Z",
            mergedAt: null,
            mergeCommitSha: null,
            verification: { ciStatus: "success", reviewStatus: "approved" },
          },
        }),
      ),
      "CI ✅ · Review ✅",
    );
    assert.equal(formatLaneCiReview(null), "—");
  });

  it("prefers merged #115 over stale open #116 when #119 is absent from lane input", () => {
    const staleFoundation = taskFixture({
      issueNumber: 116,
      status: "pr_open",
      statusLabel: "status:pr-open",
      latestUpdateAt: "2026-09-10T00:00:00.000Z",
    });
    const laneBoardRepair = taskFixture({
      issueNumber: 115,
      status: "merged",
      isOpen: false,
      mergedAt: "2026-09-22T00:00:00.000Z",
      latestUpdateAt: "2026-09-22T00:00:00.000Z",
      productionStatus: {
        status: "live",
        mergedCommitSha: "abc123",
        reason: null,
        checkedAt: "2026-09-22T00:00:00.000Z",
      },
    });

    const laneInput = prepareLaneBoardTasks([staleFoundation, laneBoardRepair]);
    const board = buildLaneBoard(laneInput);
    const automationLane = board.find((entry) => entry.laneId === "automation-platform");
    assert.equal(automationLane?.task?.issueNumber, 115);
    assert.equal(automationLane?.overallState, "production");
    assert.equal(selectLaneApprovalTask(laneInput), null);
  });

  it("does not offer Duyệt & chạy on superseded backlog when merged repair exists", () => {
    const staleFoundation = taskFixture({
      issueNumber: 116,
      status: "backlog",
      statusLabel: "status:backlog",
      latestUpdateAt: "2026-09-10T00:00:00.000Z",
    });
    const laneBoardRepair = taskFixture({
      issueNumber: 115,
      status: "merged",
      isOpen: false,
      mergedAt: "2026-09-22T00:00:00.000Z",
      latestUpdateAt: "2026-09-22T00:00:00.000Z",
      productionStatus: {
        status: "live",
        mergedCommitSha: "abc123",
        reason: null,
        checkedAt: "2026-09-22T00:00:00.000Z",
      },
    });

    const laneInput = prepareLaneBoardTasks([staleFoundation, laneBoardRepair]);
    const board = buildLaneBoard(laneInput);
    const automationLane = board.find((entry) => entry.laneId === "automation-platform");
    assert.equal(automationLane?.approvalTask, null);
  });

  it("prefers newer merged automation repair over stale open foundation (#116 vs #118/#119/#113/#115)", () => {
    const staleFoundation = taskFixture({
      issueNumber: 116,
      status: "pr_open",
      statusLabel: "status:pr-open",
      latestUpdateAt: "2026-09-10T00:00:00.000Z",
    });
    const laneBoardRepair = taskFixture({
      issueNumber: 115,
      status: "merged",
      isOpen: false,
      mergedAt: "2026-09-22T00:00:00.000Z",
      latestUpdateAt: "2026-09-22T00:00:00.000Z",
      productionStatus: {
        status: "live",
        mergedCommitSha: "abc123",
        reason: null,
        checkedAt: "2026-09-22T00:00:00.000Z",
      },
    });
    const approveBuildRepair = taskFixture({
      issueNumber: 119,
      status: "merged",
      isOpen: false,
      mergedAt: "2026-09-23T00:00:00.000Z",
      latestUpdateAt: "2026-09-23T00:00:00.000Z",
      productionStatus: {
        status: "live",
        mergedCommitSha: "def456",
        reason: null,
        checkedAt: "2026-09-23T00:00:00.000Z",
      },
    });

    const activeOnly = [staleFoundation];
    assert.equal(selectLaneRepresentativeTask(activeOnly)?.issueNumber, 116);

    const operatorTruth = prepareLaneBoardTasks([staleFoundation, laneBoardRepair, approveBuildRepair]);
    const board = buildLaneBoard(operatorTruth);
    const automationLane = board.find((entry) => entry.laneId === "automation-platform");
    assert.equal(automationLane?.task?.issueNumber, 119);
    assert.equal(automationLane?.overallState, "production");
  });

  it("shows CRM #95/#97 CI review truth instead of missing-data copy", () => {
    const crmTask = taskFixture({
      issueNumber: 95,
      taskArea: "Lead & Sales / CRM",
      status: "ci_review",
      statusLabel: "status:ci-review",
      linkedPullRequest: {
        number: 97,
        url: "https://github.com/hoangthang1209-byte/attd.vn/pull/97",
        state: "open",
        merged: false,
        title: "Lead intake hardening",
        updatedAt: "2026-09-20T00:00:00.000Z",
        mergedAt: null,
        mergeCommitSha: null,
        verification: { ciStatus: "success", reviewStatus: "pending" },
      },
    });

    assert.equal(formatLaneCiReview(crmTask), "CI ✅ · Review ⏳");
  });

  it("uses SEO #120/#121 merged fallback in active-view lane board input", () => {
    const mergedSeo = taskFixture({
      issueNumber: 121,
      taskArea: "Marketing / Content / SEO",
      status: "merged",
      isOpen: false,
      mergedAt: "2026-09-24T00:00:00.000Z",
      latestUpdateAt: "2026-09-24T00:00:00.000Z",
      productionStatus: {
        status: "live",
        mergedCommitSha: "seo121",
        reason: null,
        checkedAt: "2026-09-24T00:00:00.000Z",
      },
    });

    const laneInput = prepareLaneBoardTasks([mergedSeo]);
    const board = buildLaneBoard(laneInput);
    const seoLane = board.find((entry) => entry.laneId === "marketing-content-seo");
    assert.equal(seoLane?.task?.issueNumber, 121);
    assert.ok(isLaneProductionOrComplete(seoLane!));
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

    const mergedOnlyBoard = buildLaneBoard([
      taskFixture({
        issueNumber: 119,
        taskArea: "Automation Platform",
        status: "merged",
        isOpen: false,
        productionStatus: {
          status: "live",
          mergedCommitSha: "abc",
          reason: null,
          checkedAt: "2026-09-21T00:00:00.000Z",
        },
      }),
      taskFixture({
        issueNumber: 121,
        taskArea: "Marketing / Content / SEO",
        status: "merged",
        isOpen: false,
        productionStatus: {
          status: "unknown",
          mergedCommitSha: "def",
          reason: "Không xác định được commit production hiện tại (chỉ có trên Vercel Production).",
          checkedAt: "2026-09-21T00:00:00.000Z",
        },
      }),
    ]);
    assert.equal(buildLaneBoardSummary(mergedOnlyBoard).productionCount, 2);

    const automationLane = board.find((entry) => entry.laneId === "automation-platform");
    assert.equal(automationLane?.overallStateLabel, AUTOMATION_LANE_OVERALL_STATE_LABELS.dang_build);
  });
});
