import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import { countNoProgressAttempts } from "@/features/agent-os/cto-loop.service";
import { createAgentRun } from "@/features/agent-os/agent-run.service";
import { prisma } from "@/lib/prisma";

const TEST_ISSUE = 9_001_201;

after(async () => {
  await prisma.agentDecision.deleteMany({
    where: { agentRun: { githubIssueNumber: TEST_ISSUE } },
  });
  await prisma.agentRun.deleteMany({ where: { githubIssueNumber: TEST_ISSUE } });
  await prisma.$disconnect();
});

describe("countNoProgressAttempts", () => {
  it("counts repeated unverified POST_BUILD_APPROVED decisions toward escalation", async () => {
    const run = await createAgentRun({
      agentId: "ATTD_CTO",
      triggerSource: "GITHUB_ISSUE_STATUS",
      githubIssueNumber: TEST_ISSUE,
      idempotencyKey: `cto-run:${TEST_ISSUE}:1`,
    });

    for (let i = 0; i < 3; i += 1) {
      await prisma.agentDecision.create({
        data: {
          agentRunId: run.id,
          decisionType: "APPROVE_BUILD",
          rationaleSummary: "test",
          selectedAction: "POST_BUILD_APPROVED",
          evidenceRefs: [
            {
              type: "manual",
              ref: JSON.stringify({ priority: "test", verified: "pending", idempotencyKey: `k-${i}` }),
            },
          ],
        },
      });
    }

    const streak = await countNoProgressAttempts(TEST_ISSUE);
    assert.equal(streak, 3);
  });
});
