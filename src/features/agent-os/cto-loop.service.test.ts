import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import { ingestGitHubIssueStatusEvent } from "@/features/agent-os/agent-event.ingestion";
import { processCtoLoopForTask } from "@/features/agent-os/cto-loop.service";
import type { AutomationTask } from "@/features/automation/automation-task.types";
import { prisma } from "@/lib/prisma";

const TEST_ISSUE_IDEMPOTENT = 9_001_197;
const TEST_ISSUE_HIGH_RISK = 9_001_198;
const TEST_ISSUE_TERMINAL = 9_001_199;
const TEST_ISSUE_CONCURRENT = 9_001_200;

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
});
