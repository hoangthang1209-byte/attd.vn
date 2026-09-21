import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatShortCommitSha,
  getProductionCommitShaFromEnv,
  resolveProductionDeploymentStatus,
  shouldFetchLinkedPullRequestForProductionCheck,
} from "@/features/automation/automation-production";

describe("automation production status", () => {
  it("reads production commit SHA only on Vercel production", () => {
    assert.equal(
      getProductionCommitShaFromEnv({
        VERCEL_ENV: "production",
        VERCEL_GIT_COMMIT_SHA: "abc123def456",
      }),
      "abc123def456",
    );
    assert.equal(
      getProductionCommitShaFromEnv({
        VERCEL_ENV: "preview",
        VERCEL_GIT_COMMIT_SHA: "abc123def456",
      }),
      null,
    );
    assert.equal(getProductionCommitShaFromEnv({}), null);
  });

  it("returns not_live when PR is not merged", () => {
    assert.deepEqual(
      resolveProductionDeploymentStatus({
        productionCommitSha: "prod123",
        linkedPullRequest: { merged: false, mergeCommitSha: null },
        compareStatus: null,
      }),
      {
        status: "not_live",
        reason: "PR chưa được merge.",
      },
    );
  });

  it("returns unknown when merged task has no linked PR", () => {
    assert.deepEqual(
      resolveProductionDeploymentStatus({
        productionCommitSha: "prod123",
        linkedPullRequest: null,
        compareStatus: null,
        taskStatus: "merged",
        prLookupFailed: true,
      }),
      {
        status: "unknown",
        reason: "Không xác định được PR merge liên kết.",
      },
    );
  });

  it("returns not_live when there is no linked PR for non-merged task", () => {
    assert.deepEqual(
      resolveProductionDeploymentStatus({
        productionCommitSha: "prod123",
        linkedPullRequest: null,
        compareStatus: null,
      }),
      {
        status: "not_live",
        reason: "Chưa có PR merge.",
      },
    );
  });

  it("returns live when merged SHA equals production SHA", () => {
    assert.deepEqual(
      resolveProductionDeploymentStatus({
        productionCommitSha: "abc123def456",
        linkedPullRequest: { merged: true, mergeCommitSha: "abc123def456" },
        compareStatus: null,
      }),
      { status: "live", reason: null },
    );
  });

  it("returns live when merged SHA is an ancestor of production SHA", () => {
    for (const compareStatus of ["identical", "ahead"] as const) {
      assert.deepEqual(
        resolveProductionDeploymentStatus({
          productionCommitSha: "prod999",
          linkedPullRequest: { merged: true, mergeCommitSha: "merge111" },
          compareStatus,
        }),
        { status: "live", reason: null },
      );
    }
  });

  it("returns deploying when production is behind merged SHA", () => {
    assert.deepEqual(
      resolveProductionDeploymentStatus({
        productionCommitSha: "prod999",
        linkedPullRequest: { merged: true, mergeCommitSha: "merge111" },
        compareStatus: "behind",
      }),
      {
        status: "deploying",
        reason: "PR đã merge nhưng production chưa chứa commit merge.",
      },
    );
  });

  it("returns unknown when compare API fails", () => {
    assert.deepEqual(
      resolveProductionDeploymentStatus({
        productionCommitSha: "prod999",
        linkedPullRequest: { merged: true, mergeCommitSha: "merge111" },
        compareStatus: null,
      }),
      {
        status: "unknown",
        reason: "Không thể so sánh commit merge với production trên GitHub.",
      },
    );
  });

  it("returns unknown when production SHA is missing", () => {
    assert.deepEqual(
      resolveProductionDeploymentStatus({
        productionCommitSha: null,
        linkedPullRequest: { merged: true, mergeCommitSha: "merge111" },
        compareStatus: "ahead",
      }),
      {
        status: "unknown",
        reason: "Không xác định được commit production hiện tại (chỉ có trên Vercel Production).",
      },
    );
  });

  it("returns unknown when merged commit SHA is missing", () => {
    assert.deepEqual(
      resolveProductionDeploymentStatus({
        productionCommitSha: "prod999",
        linkedPullRequest: { merged: true, mergeCommitSha: null },
        compareStatus: null,
      }),
      {
        status: "unknown",
        reason: "Không xác định được commit merge của PR.",
      },
    );
  });

  it("returns unknown when compare status is diverged", () => {
    assert.deepEqual(
      resolveProductionDeploymentStatus({
        productionCommitSha: "prod999",
        linkedPullRequest: { merged: true, mergeCommitSha: "merge111" },
        compareStatus: "diverged",
      }),
      {
        status: "unknown",
        reason: "Lịch sử commit merge và production không đồng nhất.",
      },
    );
  });

  it("fetches linked PR for merged tasks missing PR metadata", () => {
    assert.equal(
      shouldFetchLinkedPullRequestForProductionCheck({
        status: "merged",
        linkedPullRequest: null,
      }),
      true,
    );
    assert.equal(
      shouldFetchLinkedPullRequestForProductionCheck({
        status: "merged",
        linkedPullRequest: {
          number: 1,
          url: "https://example.com",
          state: "closed",
          merged: true,
          title: "PR",
          updatedAt: "2026-09-21T00:00:00.000Z",
          mergedAt: "2026-09-21T00:00:00.000Z",
          mergeCommitSha: "abc123",
        },
      }),
      false,
    );
  });

  it("formats short commit SHA", () => {
    assert.equal(formatShortCommitSha("abc123def456789"), "abc123d");
    assert.equal(formatShortCommitSha(null), null);
  });
});
