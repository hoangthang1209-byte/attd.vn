import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  approveBuildForIssue,
  resetApproveBuildInFlightForTests,
  type ApproveBuildDependencies,
} from "@/features/automation/automation-approve-build.service";
import type {
  AutomationGitHubWriteConfig,
  GitHubIssueApprovalPayload,
} from "@/features/automation/automation-github-write.client";

const configuredWriteConfig: AutomationGitHubWriteConfig = {
  configured: true,
  configMessage: null,
  token: "write-token",
  owner: "hoangthang1209-byte",
  repo: "attd.vn",
  repoSlug: "hoangthang1209-byte/attd.vn",
};

const eligibleIssue: GitHubIssueApprovalPayload = {
  number: 116,
  title: "Automation approve build",
  state: "OPEN",
  labels: [{ name: "status:backlog" }],
  comments: [{ body: "TASK_AREA: Automation Platform" }],
};

function createDependencies(
  overrides: Partial<ApproveBuildDependencies> = {},
): ApproveBuildDependencies {
  return {
    getWriteConfig: () => configuredWriteConfig,
    validateOwnerIdentity: async () => ({ valid: true, message: null }),
    fetchIssue: async () => eligibleIssue,
    postApproval: async () => ({ commentId: 1 }),
    ...overrides,
  };
}

describe("approve build service", () => {
  it("returns not_configured when write token is missing", async () => {
    const result = await approveBuildForIssue(
      "116",
      createDependencies({
        getWriteConfig: () => ({
          configured: false,
          configMessage: "missing write token",
          owner: "hoangthang1209-byte",
          repo: "attd.vn",
          repoSlug: "hoangthang1209-byte/attd.vn",
        }),
      }),
    );
    assert.equal(result.result, "not_configured");
  });

  it("returns not_configured when write token is not repository owner", async () => {
    const result = await approveBuildForIssue(
      "116",
      createDependencies({
        validateOwnerIdentity: async () => ({
          valid: false,
          message: 'Token owner mismatch: expected "hoangthang1209-byte", got "other-user".',
        }),
      }),
    );
    assert.equal(result.result, "not_configured");
    assert.match(result.message, /owner/i);
  });

  it("dedupes when BUILD_APPROVED already exists", async () => {
    const result = await approveBuildForIssue(
      "116",
      createDependencies({
        fetchIssue: async () => ({
          ...eligibleIssue,
          comments: [...eligibleIssue.comments, { body: "BUILD_APPROVED" }],
        }),
        postApproval: async () => {
          throw new Error("should not post");
        },
      }),
    );
    assert.equal(result.result, "already_approved");
  });

  it("dedupes when BUILD_APPROVED appears on pre-post refresh", async () => {
    let fetchCount = 0;
    const result = await approveBuildForIssue(
      "116",
      createDependencies({
        fetchIssue: async () => {
          fetchCount += 1;
          if (fetchCount >= 2) {
            return {
              ...eligibleIssue,
              comments: [...eligibleIssue.comments, { body: "BUILD_APPROVED" }],
            };
          }
          return eligibleIssue;
        },
        postApproval: async () => {
          throw new Error("should not post");
        },
      }),
    );
    assert.equal(result.result, "already_approved");
    assert.ok(fetchCount >= 2);
  });

  it("serializes concurrent approvals for the same issue", async () => {
    resetApproveBuildInFlightForTests();
    let postCount = 0;
    let fetchCount = 0;

    const slowDeps = createDependencies({
      fetchIssue: async () => {
        fetchCount += 1;
        await new Promise((resolve) => setTimeout(resolve, 30));
        return eligibleIssue;
      },
      postApproval: async () => {
        postCount += 1;
        await new Promise((resolve) => setTimeout(resolve, 30));
        return { commentId: 1 };
      },
    });

    const [first, second] = await Promise.all([
      approveBuildForIssue("116", slowDeps),
      approveBuildForIssue("116", slowDeps),
    ]);

    assert.equal(postCount, 1);
    assert.ok(
      (first.result === "approved_now" && second.result === "approved_now") ||
        first.result === "already_approved" ||
        second.result === "already_approved",
    );
    assert.ok(fetchCount >= 2);
  });

  it("rejects closed issues", async () => {
    const result = await approveBuildForIssue(
      "116",
      createDependencies({
        fetchIssue: async () => ({ ...eligibleIssue, state: "CLOSED" }),
      }),
    );
    assert.equal(result.result, "ineligible");
    assert.equal(result.ineligibilityReason, "closed");
  });

  it("rejects unrecognized issues", async () => {
    const result = await approveBuildForIssue(
      "116",
      createDependencies({
        fetchIssue: async () => ({
          ...eligibleIssue,
          labels: [],
          comments: [{ body: "hello" }],
        }),
      }),
    );
    assert.equal(result.result, "ineligible");
    assert.equal(result.ineligibilityReason, "unrecognized_task");
  });

  it("posts only the fixed BUILD_APPROVED comment on success", async () => {
    let postedIssueNumber: number | null = null;
    const result = await approveBuildForIssue(
      "116",
      createDependencies({
        postApproval: async (issueNumber) => {
          postedIssueNumber = issueNumber;
          return { commentId: 99 };
        },
      }),
    );

    assert.equal(result.result, "approved_now");
    assert.equal(postedIssueNumber, 116);
    assert.match(result.message, /Đã duyệt/);
  });

  it("rejects invalid issue numbers", async () => {
    const result = await approveBuildForIssue("abc", createDependencies());
    assert.equal(result.result, "ineligible");
    assert.equal(result.ineligibilityReason, "invalid_issue_number");
  });
});
