import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import { ingestGitHubIssueStatusEvent } from "@/features/agent-os/agent-event.ingestion";
import {
  applyInboundAgentEvent,
  createAgentRun,
  createAgentRunAfterTerminal,
  retryAgentRun,
} from "@/features/agent-os/agent-run.service";
import { prisma } from "@/lib/prisma";

const TEST_ISSUE = 9_001_186;

after(async () => {
  await prisma.agentEvent.deleteMany({
    where: { agentRun: { githubIssueNumber: TEST_ISSUE } },
  });
  await prisma.agentDecision.deleteMany({
    where: { agentRun: { githubIssueNumber: TEST_ISSUE } },
  });
  await prisma.taskRun.deleteMany({
    where: { agentRun: { githubIssueNumber: TEST_ISSUE } },
  });
  await prisma.agentRun.deleteMany({ where: { githubIssueNumber: TEST_ISSUE } });
  await prisma.$disconnect();
});

describe("agent run persistence", () => {
  it("applies events idempotently", async () => {
    const run = await createAgentRun({
      agentId: "QA_AGENT",
      triggerSource: "GITHUB_ISSUE_STATUS",
      githubIssueNumber: TEST_ISSUE,
      idempotencyKey: `test-run:${TEST_ISSUE}:1`,
    });

    const inbound = ingestGitHubIssueStatusEvent({
      issueNumber: TEST_ISSUE,
      normalizedStatus: "building",
      occurredAt: "2026-01-01T00:00:00.000Z",
    });

    const first = await applyInboundAgentEvent({ agentRunId: run.id, inbound });
    const second = await applyInboundAgentEvent({ agentRunId: run.id, inbound });

    assert.equal(first.duplicate, false);
    assert.equal(second.duplicate, true);

    const updated = await prisma.agentRun.findUniqueOrThrow({ where: { id: run.id } });
    assert.equal(updated.status, "RUNNING");
  });

  it("applies the same inbound event independently to a retry attempt", async () => {
    const firstRun = await createAgentRun({
      agentId: "QA_AGENT",
      triggerSource: "GITHUB_ISSUE_STATUS",
      githubIssueNumber: TEST_ISSUE,
      idempotencyKey: `test-run:${TEST_ISSUE}:same-event:first`,
    });

    const inbound = ingestGitHubIssueStatusEvent({
      issueNumber: TEST_ISSUE,
      normalizedStatus: "building",
      eventId: "github:issue:building:shared",
    });

    const firstApply = await applyInboundAgentEvent({ agentRunId: firstRun.id, inbound });
    assert.equal(firstApply.duplicate, false);

    await prisma.agentRun.update({
      where: { id: firstRun.id },
      data: { status: "FAILED", finishedAt: new Date() },
    });

    const retry = await retryAgentRun({
      failedRunId: firstRun.id,
      triggerSource: "MANUAL_OWNER",
      idempotencyKey: `test-run:${TEST_ISSUE}:same-event:retry`,
    });

    const retryApply = await applyInboundAgentEvent({ agentRunId: retry.id, inbound });
    assert.equal(retryApply.duplicate, false);

    const retryUpdated = await prisma.agentRun.findUniqueOrThrow({ where: { id: retry.id } });
    assert.equal(retryUpdated.status, "RUNNING");
  });

  it("retry creates a new attempt linked to parent", async () => {
    const failed = await createAgentRun({
      agentId: "QA_AGENT",
      triggerSource: "CI_RESULT",
      githubIssueNumber: TEST_ISSUE,
      idempotencyKey: `test-run:${TEST_ISSUE}:failed`,
    });

    await prisma.agentRun.update({
      where: { id: failed.id },
      data: { status: "FAILED", finishedAt: new Date() },
    });

    const retried = await retryAgentRun({
      failedRunId: failed.id,
      triggerSource: "MANUAL_OWNER",
      idempotencyKey: `test-run:${TEST_ISSUE}:retry`,
    });

    assert.equal(retried.attemptNumber, failed.attemptNumber + 1);
    assert.equal(retried.parentRunId, failed.id);
    assert.equal(retried.status, "QUEUED");
  });

  it("createAgentRunAfterTerminal allows a new attempt after SUCCEEDED", async () => {
    const succeeded = await createAgentRun({
      agentId: "ATTD_CTO",
      triggerSource: "GITHUB_ISSUE_STATUS",
      githubIssueNumber: TEST_ISSUE,
      idempotencyKey: `test-run:${TEST_ISSUE}:succeeded`,
    });

    await prisma.agentRun.update({
      where: { id: succeeded.id },
      data: { status: "SUCCEEDED", finishedAt: new Date() },
    });

    const next = await createAgentRunAfterTerminal({
      priorRunId: succeeded.id,
      triggerSource: "GITHUB_ISSUE_STATUS",
      idempotencyKey: `test-run:${TEST_ISSUE}:after-success`,
    });

    assert.equal(next.attemptNumber, succeeded.attemptNumber + 1);
    assert.equal(next.parentRunId, succeeded.id);
  });
});
