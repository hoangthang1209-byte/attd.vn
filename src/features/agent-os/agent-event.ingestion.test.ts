import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ingestCiResultEvent,
  ingestGitHubIssueStatusEvent,
  ingestGitHubPrEvent,
  ingestManualOwnerDecisionEvent,
  ingestReviewerResultEvent,
  ingestVercelDeploymentEvent,
} from "@/features/agent-os/agent-event.ingestion";

describe("agent event ingestion", () => {
  it("builds stable idempotency keys for github issue status", () => {
    const a = ingestGitHubIssueStatusEvent({
      issueNumber: 186,
      normalizedStatus: "building",
      occurredAt: "t1",
    });
    const b = ingestGitHubIssueStatusEvent({
      issueNumber: 186,
      normalizedStatus: "building",
      occurredAt: "t1",
    });
    assert.equal(a.idempotencyKey, b.idempotencyKey);
    assert.equal(a.suggestedStatus, "RUNNING");
  });

  it("flags CI failure as waiting for human", () => {
    const event = ingestCiResultEvent({
      pullNumber: 200,
      checkName: "build",
      conclusion: "failure",
      eventId: "check-run:200:build:1",
    });
    assert.equal(event.suggestedStatus, "WAITING_HUMAN");
    assert.match(event.blockerReason ?? "", /CI build/);
  });

  it("maps merged PRs to WAITING_EXTERNAL", () => {
    const event = ingestGitHubPrEvent({
      issueNumber: 186,
      pullNumber: 187,
      state: "closed",
      merged: true,
      eventId: "pr:187:merged",
    });
    assert.equal(event.suggestedStatus, "WAITING_EXTERNAL");
  });

  it("maps requested reviewer changes to WAITING_HUMAN", () => {
    const event = ingestReviewerResultEvent({
      pullNumber: 187,
      reviewState: "changes_requested",
      eventId: "review:187:changes",
    });
    assert.equal(event.suggestedStatus, "WAITING_HUMAN");
    assert.equal(event.blockerReason, "Reviewer yêu cầu chỉnh sửa");
  });

  it("maps ready production deployments to SUCCEEDED", () => {
    const event = ingestVercelDeploymentEvent({
      environment: "production",
      deploymentState: "ready",
      commitSha: "abc1234",
      eventId: "deploy:abc1234:ready",
    });
    assert.equal(event.suggestedStatus, "SUCCEEDED");
  });

  it("does not embed secrets in payload summary", () => {
    const event = ingestManualOwnerDecisionEvent({
      issueNumber: 1,
      decision: "approve_build",
      actorLogin: "owner",
      eventId: "owner-decision:1",
    });
    assert.equal(event.payloadSummary.kind, "manual_owner");
    assert.ok(!JSON.stringify(event.payloadSummary).includes("token"));
  });
  it("rejects events without a stable identity", () => {
    assert.throws(
      () =>
        ingestCiResultEvent({
          pullNumber: 201,
          checkName: "build",
          conclusion: "success",
        }),
      /requires eventId or occurredAt/,
    );
  });

});
