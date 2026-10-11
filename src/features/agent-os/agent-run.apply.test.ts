import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ingestManualOwnerDecisionEvent } from "@/features/agent-os/agent-event.ingestion";
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
