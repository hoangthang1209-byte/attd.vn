import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ingestCiResultEvent,
  ingestManualOwnerDecisionEvent,
  ingestVercelDeploymentEvent,
} from "@/features/agent-os/agent-event.ingestion";
import {
  applyInboundEventToRunFields,
  initialRunFields,
} from "@/features/agent-os/agent-run.apply";

describe("applyInboundEventToRunFields", () => {
  it("starts run on RUNNING suggestion from QUEUED", () => {
    const next = applyInboundEventToRunFields(initialRunFields(), {
      source: "GITHUB_ISSUE_STATUS",
      idempotencyKey: "k1",
      payloadSummary: { kind: "test" },
      suggestedStatus: "RUNNING",
    });
    assert.equal(next.status, "RUNNING");
    assert.ok(next.startedAt);
  });

  it("moves queued runs to WAITING_HUMAN on immediate CI blockers", () => {
    const inbound = ingestCiResultEvent({
      pullNumber: 187,
      checkName: "Verify",
      conclusion: "failure",
      eventId: "check-run:187:verify:failure",
    });
    const next = applyInboundEventToRunFields(initialRunFields(), inbound);
    assert.equal(next.status, "WAITING_HUMAN");
    assert.match(next.blockerReason ?? "", /CI Verify/);
  });

  it("completes WAITING_EXTERNAL on production-ready deployment", () => {
    const inbound = ingestVercelDeploymentEvent({
      environment: "production",
      deploymentState: "ready",
      commitSha: "abc1234",
      eventId: "vercel:deployment:ready:abc1234",
    });
    const next = applyInboundEventToRunFields(
      { ...initialRunFields(), status: "WAITING_EXTERNAL", startedAt: new Date("2026-01-01") },
      inbound,
    );
    assert.equal(next.status, "SUCCEEDED");
    assert.ok(next.finishedAt);
  });

  it("records human approval timestamp", () => {
    const inbound = ingestManualOwnerDecisionEvent({
      issueNumber: 186,
      decision: "approve_build",
      actorLogin: "owner",
      occurredAt: "2026-01-01T00:00:00.000Z",
    });
    const next = applyInboundEventToRunFields(
      { ...initialRunFields(), status: "WAITING_HUMAN", humanApprovalRequired: true },
      inbound,
    );
    assert.ok(next.humanApprovalReceivedAt);
    assert.equal(next.humanApprovalRequired, false);
  });

  it("sets finishedAt on terminal transition", () => {
    const next = applyInboundEventToRunFields(
      { ...initialRunFields(), status: "RUNNING", startedAt: new Date("2026-01-01") },
      {
        source: "VERCEL_DEPLOYMENT",
        idempotencyKey: "k2",
        payloadSummary: { kind: "deploy" },
        suggestedStatus: "SUCCEEDED",
      },
    );
    assert.equal(next.status, "SUCCEEDED");
    assert.ok(next.finishedAt);
  });
});
