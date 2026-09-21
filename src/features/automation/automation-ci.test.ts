import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveCiStatusFromCheckRuns } from "@/features/automation/automation-ci";

describe("automation CI status", () => {
  it("returns not_run without linked PR", () => {
    assert.deepEqual(
      resolveCiStatusFromCheckRuns({
        checkRuns: [],
        commitStatuses: [],
        hasLinkedPullRequest: false,
      }),
      { status: "not_run", reason: "Chưa có PR liên kết." },
    );
  });

  it("returns running when checks are in progress", () => {
    assert.deepEqual(
      resolveCiStatusFromCheckRuns({
        checkRuns: [{ name: "CI", status: "in_progress", conclusion: null }],
        commitStatuses: [],
        hasLinkedPullRequest: true,
      }).status,
      "running",
    );
  });

  it("returns failed when a check run failed", () => {
    assert.deepEqual(
      resolveCiStatusFromCheckRuns({
        checkRuns: [{ name: "CI", status: "completed", conclusion: "failure" }],
        commitStatuses: [],
        hasLinkedPullRequest: true,
      }).status,
      "failed",
    );
  });

  it("returns passed when checks succeed", () => {
    assert.deepEqual(
      resolveCiStatusFromCheckRuns({
        checkRuns: [{ name: "CI", status: "completed", conclusion: "success" }],
        commitStatuses: ["success"],
        hasLinkedPullRequest: true,
      }),
      { status: "passed", reason: null },
    );
  });
});
