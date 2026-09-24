import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  derivePullRequestVerificationDisplay,
  formatPullRequestVerificationDisplay,
} from "@/features/automation/automation-pull-request-verification";
import type { AutomationLinkedPullRequest } from "@/features/automation/automation-task.types";

function linkedPullRequestFixture(
  overrides: Partial<AutomationLinkedPullRequest> = {},
): AutomationLinkedPullRequest {
  return {
    number: 97,
    url: "https://github.com/hoangthang1209-byte/attd.vn/pull/97",
    state: "open",
    merged: false,
    title: "Lead intake hardening",
    updatedAt: "2026-09-20T00:00:00.000Z",
    mergedAt: null,
    mergeCommitSha: null,
    ...overrides,
  };
}

describe("automation pull request verification display", () => {
  it("formats CI and review verification labels", () => {
    assert.equal(
      formatPullRequestVerificationDisplay({
        ciStatus: "success",
        reviewStatus: "approved",
      }),
      "CI ✅ · Review ✅",
    );
    assert.equal(
      formatPullRequestVerificationDisplay({
        ciStatus: "pending",
        reviewStatus: "changes_requested",
      }),
      "CI ⏳ · Review ❌",
    );
  });

  it("derives CRM #95/#97 CI review truth from linked PR verification", () => {
    const display = derivePullRequestVerificationDisplay({
      status: "ci_review",
      linkedPullRequest: linkedPullRequestFixture({
        verification: { ciStatus: "success", reviewStatus: "pending" },
      }),
    });
    assert.equal(display, "CI ✅ · Review ⏳");
  });

  it("derives Public UI #96/#98 verify/reviewer truth when checks are green", () => {
    const display = derivePullRequestVerificationDisplay({
      status: "pr_open",
      linkedPullRequest: linkedPullRequestFixture({
        number: 98,
        verification: { ciStatus: "success", reviewStatus: "approved" },
      }),
    });
    assert.equal(display, "CI ✅ · Review ✅");
  });

  it("falls back to in-progress copy for open PRs without verification payload", () => {
    const display = derivePullRequestVerificationDisplay({
      status: "pr_open",
      linkedPullRequest: linkedPullRequestFixture(),
    });
    assert.equal(display, "CI ⏳ · Review ⏳");
  });
});
