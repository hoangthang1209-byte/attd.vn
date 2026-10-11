import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import { ingestGitHubIssueStatusEvent } from "@/features/agent-os/agent-event.ingestion";
import {
  persistCtoLoopStepForIntegrationTests,
  processCtoLoopForTask,
} from "@/features/agent-os/cto-loop.service";
import { buildPostBuildApprovedDedupeKey } from "@/features/agent-os/cto-loop.dedupe";
import type { AutomationTask } from "@/features/automation/automation-task.types";
import { prisma } from "@/lib/prisma";

const TEST_ISSUE_IDEMPOTENT = 9_001_197;
const TEST_ISSUE_HIGH_RISK = 9_001_198;
const TEST_ISSUE_TERMINAL = 9_001_199;
const TEST_ISSUE_CONCURRENT = 9_001_200;
const TEST_ISSUE_PERSIST_RECOVERY = 9_001_201;
const TEST_ISSUE_EXECUTE_RETRY = 9_001_202;
const TEST_ISSUE_ASSIGN_CONCURRENT = 9_001_203;
const TEST_ISSUE_FAILED_TERMINAL = 9_001_204;
const TEST_ISSUE_CANCELLED_TERMINAL = 9_001_205;
const TEST_ISSUE_ORPHAN_PENDING = 9_001_206;
const TEST_ISSUE_ORPHAN_LEGACY_KEY = 9_001_207;
const TEST_ISSUE_ORPHAN_MISATTRIBUTION = 9_001_208;
const TEST_ISSUE_ORPHAN_UNCONFIRMED_BOUND = 9_001_209;

function taskFixture(
  issueNumber: number,
  overrides: Partial<AutomationTask> = {},
): AutomationTask {
  return {
    issueNumber,
    title: "G3 loop test task",
    taskArea: "Automation Platform",
    metadataTaskArea: null,
    status: "backlog",
    statusLabel: "status:backlog",
    risk: "low",
    riskLabel: "risk:low",
    linkedPullRequest: null,
    latestUpdateAt: "2026-01-01T00:00:00.000Z",
    closedAt: null,
    mergedAt: null,
    blockerReason: null,
    isOpen: true,
    githubIssueUrl: `https://github.com/hoangthang1209-byte/attd.vn/issues/${issueNumber}`,
    labels: ["status:backlog", "risk:low"],
    recentStatusComments: [
      { author: "owner", body: "TASK_AREA: Automation Platform", createdAt: "2026-01-01T00:00:00.000Z" },
    ],
    hasBuildApproved: false,
    productionStatus: {
      status: "not_live",
      mergedCommitSha: null,
      reason: null,
      checkedAt: "2026-01-01T00:00:00.000Z",
    },
    agentAssignment: {
      agentId: "QA_AGENT",
      agentDisplayName: "QA",
      routingReason: "task_area",
      requiresHumanEscalation: false,
      agentOverrideAreaMismatch: false,
    },
    taskPriority: "P2",
    parentTaskIssueNumber: null,
    ...overrides,
  };
}

async function cleanupIssues(issueNumbers: number[]) {
  for (const githubIssueNumber of issueNumbers) {
    await prisma.agentEvent.deleteMany({
      where: { agentRun: { githubIssueNumber } },
    });
    await prisma.agentDecision.deleteMany({
      where: { agentRun: { githubIssueNumber } },
    });
    await prisma.taskRun.deleteMany({
      where: { agentRun: { githubIssueNumber } },
    });
    await prisma.agentRun.deleteMany({ where: { githubIssueNumber } });
  }
}

after(async () => {
  await cleanupIssues([
    TEST_ISSUE_IDEMPOTENT,
    TEST_ISSUE_HIGH_RISK,
    TEST_ISSUE_TERMINAL,
    TEST_ISSUE_CONCURRENT,
    TEST_ISSUE_PERSIST_RECOVERY,
    TEST_ISSUE_EXECUTE_RETRY,
    TEST_ISSUE_ASSIGN_CONCURRENT,
    TEST_ISSUE_FAILED_TERMINAL,
    TEST_ISSUE_CANCELLED_TERMINAL,
    TEST_ISSUE_ORPHAN_PENDING,
    TEST_ISSUE_ORPHAN_LEGACY_KEY,
    TEST_ISSUE_ORPHAN_MISATTRIBUTION,
    TEST_ISSUE_ORPHAN_UNCONFIRMED_BOUND,
  ]);
  await prisma.$disconnect();
});

describe("processCtoLoopForTask", () => {
  it("is idempotent for duplicate inbound events", async () => {
    const inbound = ingestGitHubIssueStatusEvent({
      issueNumber: TEST_ISSUE_IDEMPOTENT,
      normalizedStatus: "building",
      eventId: "g3-test-building",
    });

    const first = await processCtoLoopForTask({
      task: taskFixture(TEST_ISSUE_IDEMPOTENT, { status: "building" }),
      inbound,
      duplicateSourceEvent: false,
    });

    const second = await processCtoLoopForTask({
      task: taskFixture(TEST_ISSUE_IDEMPOTENT, { status: "building" }),
      inbound,
      duplicateSourceEvent: true,
    });

    assert.equal(second.skipped, true);
    assert.equal(second.plan.selectedAction, "NOOP");

    const runs = await prisma.agentRun.count({
      where: { githubIssueNumber: TEST_ISSUE_IDEMPOTENT },
    });
    assert.equal(runs, 1);
    assert.ok(first.agentRunId);
  });

  it("escalates high-risk tasks without posting BUILD_APPROVED", async () => {
    const result = await processCtoLoopForTask({
      task: taskFixture(TEST_ISSUE_HIGH_RISK, {
        risk: "high",
        labels: ["status:backlog", "risk:high"],
      }),
    });

    assert.equal(result.plan.selectedAction, "ESCALATE_HIGH_RISK");
    const run = await prisma.agentRun.findFirstOrThrow({
      where: { githubIssueNumber: TEST_ISSUE_HIGH_RISK, agentId: "ATTD_CTO" },
    });
    assert.equal(run.humanApprovalRequired, true);
  });

  it("does not mutate terminal CTO runs without a new inbound event", async () => {
    const first = await processCtoLoopForTask({
      task: taskFixture(TEST_ISSUE_TERMINAL, { status: "building" }),
    });

    await prisma.agentRun.update({
      where: { id: first.agentRunId },
      data: { status: "SUCCEEDED", finishedAt: new Date("2026-01-02T00:00:00.000Z") },
    });

    const terminalBefore = await prisma.agentRun.findUniqueOrThrow({
      where: { id: first.agentRunId },
    });

    const idle = await processCtoLoopForTask({
      task: taskFixture(TEST_ISSUE_TERMINAL, { status: "building" }),
    });

    assert.equal(idle.skipped, true);
    assert.equal(idle.execution.skippedReason, "terminal_run_idle");

    const terminalAfter = await prisma.agentRun.findUniqueOrThrow({
      where: { id: first.agentRunId },
    });
    assert.equal(terminalAfter.status, "SUCCEEDED");
    assert.equal(
      terminalAfter.finishedAt?.toISOString(),
      terminalBefore.finishedAt?.toISOString(),
    );

    const runCount = await prisma.agentRun.count({
      where: { githubIssueNumber: TEST_ISSUE_TERMINAL, agentId: "ATTD_CTO" },
    });
    assert.equal(runCount, 1);
  });

  it("creates a new CTO attempt after terminal when inbound arrives", async () => {
    const first = await processCtoLoopForTask({
      task: taskFixture(TEST_ISSUE_TERMINAL, { status: "building" }),
    });

    await prisma.agentRun.update({
      where: { id: first.agentRunId },
      data: { status: "SUCCEEDED", finishedAt: new Date() },
    });

    const inbound = ingestGitHubIssueStatusEvent({
      issueNumber: TEST_ISSUE_TERMINAL,
      normalizedStatus: "ci_review",
      eventId: "g3-resume-after-terminal",
    });

    const second = await processCtoLoopForTask({
      task: taskFixture(TEST_ISSUE_TERMINAL, { status: "ci_review" }),
      inbound,
    });

    assert.notEqual(second.agentRunId, first.agentRunId);

    const resumed = await prisma.agentRun.findUniqueOrThrow({
      where: { id: second.agentRunId },
    });
    assert.equal(resumed.parentRunId, first.agentRunId);
    assert.equal(resumed.attemptNumber, 2);
  });

  it("prevents concurrent external-write double execution for the same action key", async () => {
    let approveCalls = 0;
    const deps = {
      postBuildApproved: async (issueNumber: number) => {
        approveCalls += 1;
        await new Promise((resolve) => setTimeout(resolve, 50));
        return { result: "approved_now" as const, issueNumber, message: "ok" };
      },
    };

    const task = taskFixture(TEST_ISSUE_CONCURRENT, {
      status: "backlog",
      hasBuildApproved: false,
      labels: ["status:backlog", "risk:low"],
    });

    const [a, b] = await Promise.all([
      processCtoLoopForTask({ task, deps }),
      processCtoLoopForTask({ task, deps }),
    ]);

    const submittedCount = [a, b].filter((r) => r.execution.submitted).length;
    assert.equal(submittedCount, 1);
    assert.ok(approveCalls <= 1);
  });

  it("recovers audit persistence after external write when first persist attempts fail", async () => {
    let persistCalls = 0;

    const deps = {
      postBuildApproved: async (issueNumber: number) => ({
        result: "approved_now" as const,
        issueNumber,
        message: "ok",
      }),
    };

    const task = taskFixture(TEST_ISSUE_PERSIST_RECOVERY, {
      status: "backlog",
      hasBuildApproved: false,
      labels: ["status:backlog", "risk:low"],
    });

    const result = await processCtoLoopForTask({
      task,
      deps,
      persistStepOverride: async (input) => {
        persistCalls += 1;
        if (persistCalls <= 2) {
          throw new Error("simulated persist failure");
        }
        await persistCtoLoopStepForIntegrationTests(input);
      },
    });

    assert.equal(result.execution.submitted, true);
    assert.ok(persistCalls >= 3);

    const decisions = await prisma.agentDecision.count({
      where: { agentRun: { githubIssueNumber: TEST_ISSUE_PERSIST_RECOVERY } },
    });
    assert.equal(decisions, 1);

    const run = await prisma.agentRun.findFirstOrThrow({
      where: { githubIssueNumber: TEST_ISSUE_PERSIST_RECOVERY, agentId: "ATTD_CTO" },
    });
    const summary = run.outputSummary as Record<string, unknown>;
    assert.equal(typeof summary.g3LastActionKey, "string");
    assert.equal(summary.g3PendingActionKey, undefined);
  });

  it("clears pending action slot after execute error so retry can succeed", async () => {
    let approveCalls = 0;
    const deps = {
      postBuildApproved: async (issueNumber: number) => {
        approveCalls += 1;
        if (approveCalls === 1) {
          throw new Error("simulated upstream failure");
        }
        return { result: "approved_now" as const, issueNumber, message: "ok" };
      },
    };

    const task = taskFixture(TEST_ISSUE_EXECUTE_RETRY, {
      status: "backlog",
      hasBuildApproved: false,
      labels: ["status:backlog", "risk:low"],
    });

    await assert.rejects(() => processCtoLoopForTask({ task, deps }));

    const runAfterFailure = await prisma.agentRun.findFirstOrThrow({
      where: { githubIssueNumber: TEST_ISSUE_EXECUTE_RETRY, agentId: "ATTD_CTO" },
    });
    const pendingAfterFailure = (runAfterFailure.outputSummary as Record<string, unknown>)
      .g3PendingActionKey;
    assert.equal(pendingAfterFailure, undefined);

    const retry = await processCtoLoopForTask({ task, deps });
    assert.equal(retry.execution.submitted, true);
    assert.equal(approveCalls, 2);
  });

  it("prevents concurrent non-external actions from double-persisting decisions", async () => {
    const task = taskFixture(TEST_ISSUE_ASSIGN_CONCURRENT, {
      status: "building",
      labels: ["status:building", "risk:low"],
    });

    const [a, b] = await Promise.all([
      processCtoLoopForTask({ task }),
      processCtoLoopForTask({ task }),
    ]);

    assert.equal(a.plan.selectedAction, "WAIT_EXTERNAL");
    assert.equal(b.plan.selectedAction, "WAIT_EXTERNAL");

    const persisted = [a, b].filter((r) => !r.skipped).length;
    assert.ok(persisted <= 1);

    const decisions = await prisma.agentDecision.count({
      where: {
        agentRun: { githubIssueNumber: TEST_ISSUE_ASSIGN_CONCURRENT },
        selectedAction: "WAIT_EXTERNAL",
      },
    });
    assert.equal(decisions, 1);
  });

  it("recovers legacy orphan rows with pending key only (no g3PendingAction)", async () => {
    let approveCalls = 0;
    const deps = {
      postBuildApproved: async () => {
        approveCalls += 1;
        return { result: "approved_now" as const, issueNumber: TEST_ISSUE_ORPHAN_LEGACY_KEY, message: "ok" };
      },
    };

    const bootstrap = await processCtoLoopForTask({
      task: taskFixture(TEST_ISSUE_ORPHAN_LEGACY_KEY, {
        status: "building",
        labels: ["status:building", "risk:low"],
      }),
    });
    const pendingKey = buildPostBuildApprovedDedupeKey({
      issueNumber: TEST_ISSUE_ORPHAN_LEGACY_KEY,
      prNumber: null,
      prHeadSha: null,
      reviewState: null,
      ciStatus: null,
    });

    await prisma.agentRun.update({
      where: { id: bootstrap.agentRunId },
      data: {
        outputSummary: {
          g3PendingActionKey: pendingKey,
        },
      },
    });

    const recovered = await processCtoLoopForTask({
      task: taskFixture(TEST_ISSUE_ORPHAN_LEGACY_KEY, {
        status: "backlog",
        hasBuildApproved: true,
        labels: ["status:backlog", "risk:low"],
      }),
      deps,
    });

    assert.equal(approveCalls, 0);
    assert.equal(recovered.execution.skippedReason, "orphaned_pending_recovered");
    assert.equal(recovered.execution.submitted, true);
  });

  it("does not recover orphan when BUILD_APPROVED cannot be correlated to pending key", async () => {
    const pendingKey = buildPostBuildApprovedDedupeKey({
      issueNumber: TEST_ISSUE_ORPHAN_MISATTRIBUTION,
      prNumber: 99,
      prHeadSha: "abc123456789",
      reviewState: "approved",
      ciStatus: "success",
    });

    const bootstrap = await processCtoLoopForTask({
      task: taskFixture(TEST_ISSUE_ORPHAN_MISATTRIBUTION, { status: "building" }),
    });

    await prisma.agentRun.update({
      where: { id: bootstrap.agentRunId },
      data: {
        outputSummary: {
          g3PendingActionKey: pendingKey,
          g3PendingAction: "POST_BUILD_APPROVED",
        },
      },
    });

    const result = await processCtoLoopForTask({
      task: taskFixture(TEST_ISSUE_ORPHAN_MISATTRIBUTION, {
        hasBuildApproved: true,
        linkedPullRequest: {
          number: 99,
          title: "test",
          url: "https://github.com/hoangthang1209-byte/attd.vn/pull/99",
          state: "open",
          updatedAt: "2026-01-01T00:00:00.000Z",
          mergedAt: null,
          merged: false,
          mergeCommitSha: "deadbeef00000000000000000000000000000000",
          verification: { reviewStatus: "approved", ciStatus: "success" },
        },
      }),
    });

    assert.equal(result.execution.skippedReason, "orphaned_pending_unconfirmed");
    assert.equal(result.execution.submitted, false);

    const run = await prisma.agentRun.findUniqueOrThrow({ where: { id: bootstrap.agentRunId } });
    const summary = run.outputSummary as Record<string, unknown>;
    assert.equal(summary.g3PendingActionKey, pendingKey);
  });

  it("escalates after bounded orphaned_pending_unconfirmed attempts", async () => {
    const pendingKey = buildPostBuildApprovedDedupeKey({
      issueNumber: TEST_ISSUE_ORPHAN_UNCONFIRMED_BOUND,
      prNumber: null,
      prHeadSha: null,
      reviewState: null,
      ciStatus: null,
    });

    const bootstrap = await processCtoLoopForTask({
      task: taskFixture(TEST_ISSUE_ORPHAN_UNCONFIRMED_BOUND, { status: "building" }),
    });

    await prisma.agentRun.update({
      where: { id: bootstrap.agentRunId },
      data: {
        outputSummary: {
          g3PendingActionKey: pendingKey,
          g3PendingAction: "POST_BUILD_APPROVED",
        },
      },
    });

    const unconfirmedTask = taskFixture(TEST_ISSUE_ORPHAN_UNCONFIRMED_BOUND, {
      hasBuildApproved: false,
      linkedPullRequest: {
        number: 1,
        title: "test",
        url: "https://github.com/hoangthang1209-byte/attd.vn/pull/1",
        state: "open",
        updatedAt: "2026-01-01T00:00:00.000Z",
        mergedAt: null,
        merged: false,
        mergeCommitSha: "abc1234567890123456789012345678901234567890",
        verification: { reviewStatus: "pending", ciStatus: "pending" },
      },
    });

    for (let i = 0; i < 3; i += 1) {
      const tick = await processCtoLoopForTask({ task: unconfirmedTask });
      assert.equal(tick.execution.skippedReason, "orphaned_pending_unconfirmed");
    }

    const escalated = await processCtoLoopForTask({ task: unconfirmedTask });
    assert.equal(escalated.execution.skippedReason, "orphan_unconfirmed_escalated");
    assert.equal(escalated.plan.selectedAction, "ESCALATE_NO_PROGRESS");

    const run = await prisma.agentRun.findUniqueOrThrow({ where: { id: bootstrap.agentRunId } });
    const summary = run.outputSummary as Record<string, unknown>;
    assert.equal(summary.g3PendingActionKey, undefined);
  });

  it("recovers orphaned pending external action via observation without duplicate GitHub write", async () => {
    let approveCalls = 0;
    const deps = {
      postBuildApproved: async (issueNumber: number) => {
        approveCalls += 1;
        return { result: "approved_now" as const, issueNumber, message: "ok" };
      },
    };

    const bootstrap = await processCtoLoopForTask({
      task: taskFixture(TEST_ISSUE_ORPHAN_PENDING, {
        status: "building",
        labels: ["status:building", "risk:low"],
      }),
    });
    const pendingKey = buildPostBuildApprovedDedupeKey({
      issueNumber: TEST_ISSUE_ORPHAN_PENDING,
      prNumber: null,
      prHeadSha: null,
      reviewState: null,
      ciStatus: null,
    });

    await prisma.agentRun.update({
      where: { id: bootstrap.agentRunId },
      data: {
        outputSummary: {
          g3PendingActionKey: pendingKey,
          g3PendingAction: "POST_BUILD_APPROVED",
        },
      },
    });

    approveCalls = 0;

    const recovered = await processCtoLoopForTask({
      task: taskFixture(TEST_ISSUE_ORPHAN_PENDING, {
        status: "backlog",
        hasBuildApproved: true,
        labels: ["status:backlog", "risk:low"],
      }),
      deps,
    });

    assert.equal(approveCalls, 0);
    assert.equal(recovered.execution.skippedReason, "orphaned_pending_recovered");
    assert.equal(recovered.execution.submitted, true);

    const run = await prisma.agentRun.findUniqueOrThrow({ where: { id: bootstrap.agentRunId } });
    const summary = run.outputSummary as Record<string, unknown>;
    assert.equal(summary.g3LastActionKey, pendingKey);
    assert.equal(summary.g3PendingActionKey, undefined);

    const decisions = await prisma.agentDecision.count({
      where: { agentRunId: bootstrap.agentRunId, selectedAction: "POST_BUILD_APPROVED" },
    });
    assert.equal(decisions, 1);
  });

  it("creates a new CTO attempt after CANCELLED terminal when inbound arrives", async () => {
    const first = await processCtoLoopForTask({
      task: taskFixture(TEST_ISSUE_CANCELLED_TERMINAL, { status: "building" }),
    });

    await prisma.agentRun.update({
      where: { id: first.agentRunId },
      data: { status: "CANCELLED", finishedAt: new Date() },
    });

    const inbound = ingestGitHubIssueStatusEvent({
      issueNumber: TEST_ISSUE_CANCELLED_TERMINAL,
      normalizedStatus: "ci_review",
      eventId: "g3-resume-after-cancelled",
    });

    const second = await processCtoLoopForTask({
      task: taskFixture(TEST_ISSUE_CANCELLED_TERMINAL, { status: "ci_review" }),
      inbound,
    });

    assert.notEqual(second.agentRunId, first.agentRunId);
    const resumed = await prisma.agentRun.findUniqueOrThrow({
      where: { id: second.agentRunId },
    });
    assert.equal(resumed.parentRunId, first.agentRunId);
    assert.equal(resumed.attemptNumber, 2);
    assert.equal(resumed.idempotencyKey, `cto-run:${TEST_ISSUE_CANCELLED_TERMINAL}:2`);
  });

  it("creates a new CTO attempt after FAILED terminal when inbound arrives", async () => {
    const first = await processCtoLoopForTask({
      task: taskFixture(TEST_ISSUE_FAILED_TERMINAL, { status: "building" }),
    });

    await prisma.agentRun.update({
      where: { id: first.agentRunId },
      data: { status: "FAILED", finishedAt: new Date() },
    });

    const inbound = ingestGitHubIssueStatusEvent({
      issueNumber: TEST_ISSUE_FAILED_TERMINAL,
      normalizedStatus: "ci_review",
      eventId: "g3-resume-after-failed",
    });

    const second = await processCtoLoopForTask({
      task: taskFixture(TEST_ISSUE_FAILED_TERMINAL, { status: "ci_review" }),
      inbound,
    });

    assert.notEqual(second.agentRunId, first.agentRunId);
    const resumed = await prisma.agentRun.findUniqueOrThrow({
      where: { id: second.agentRunId },
    });
    assert.equal(resumed.parentRunId, first.agentRunId);
    assert.equal(resumed.attemptNumber, 2);
  });
});
