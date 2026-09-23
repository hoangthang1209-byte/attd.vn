import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  approveBuildForIssue,
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
