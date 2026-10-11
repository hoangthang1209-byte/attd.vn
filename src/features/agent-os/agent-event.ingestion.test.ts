import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ingestCiResultEvent,
  ingestGitHubIssueStatusEvent,
  ingestManualOwnerDecisionEvent,
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
    });
    assert.equal(event.suggestedStatus, "WAITING_HUMAN");
    assert.match(event.blockerReason ?? "", /CI build/);
  });

  it("does not embed secrets in payload summary", () => {
    const event = ingestManualOwnerDecisionEvent({
      issueNumber: 1,
      decision: "approve_build",
      actorLogin: "owner",
    });
    assert.equal(event.payloadSummary.kind, "manual_owner");
    assert.ok(!JSON.stringify(event.payloadSummary).includes("token"));
  });
});
