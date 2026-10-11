import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AgentRunTransitionError,
  assertAgentRunTransition,
  canTransitionAgentRunStatus,
  isTerminalAgentRunStatus,
  nextStatusAfterEvent,
} from "@/features/agent-os/agent-run.state-machine";

describe("agent run state machine", () => {
  it("marks terminal statuses", () => {
    assert.equal(isTerminalAgentRunStatus("SUCCEEDED"), true);
    assert.equal(isTerminalAgentRunStatus("RUNNING"), false);
  });

  it("allows QUEUED → RUNNING", () => {
    assert.equal(canTransitionAgentRunStatus("QUEUED", "RUNNING"), true);
  });

  it("blocks transitions from terminal states", () => {
    assert.equal(canTransitionAgentRunStatus("SUCCEEDED", "RUNNING"), false);
    assert.equal(canTransitionAgentRunStatus("FAILED", "QUEUED"), false);
  });

  it("allows WAITING_HUMAN → SUCCEEDED", () => {
    assert.equal(canTransitionAgentRunStatus("WAITING_HUMAN", "SUCCEEDED"), true);
  });

  it("allows WAITING_EXTERNAL → SUCCEEDED for production completion", () => {
    assert.equal(canTransitionAgentRunStatus("WAITING_EXTERNAL", "SUCCEEDED"), true);
  });

  it("allows QUEUED → WAITING_HUMAN for immediate blockers", () => {
    assert.equal(canTransitionAgentRunStatus("QUEUED", "WAITING_HUMAN"), true);
  });

  it("throws on invalid transition", () => {
    assert.throws(() => assertAgentRunTransition("QUEUED", "SUCCEEDED"), AgentRunTransitionError);
  });

  it("nextStatusAfterEvent keeps current when transition invalid", () => {
    assert.equal(
      nextStatusAfterEvent({ current: "QUEUED", suggested: "SUCCEEDED" }),
      "QUEUED",
    );
  });
});
