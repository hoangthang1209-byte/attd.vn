import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AGENT_REGISTRY,
  assertRegistryInvariants,
  getActiveAgent,
  isKnownAgentId,
  listActiveAgents,
} from "@/features/agent-os/agent-registry";
import { AGENT_IDS } from "@/features/agent-os/agent.types";

describe("agent registry", () => {
  it("defines exactly eight unique active agents", () => {
    assertRegistryInvariants();
    assert.equal(AGENT_REGISTRY.length, 8);
    assert.equal(listActiveAgents().length, 8);
    for (const id of AGENT_IDS) {
      assert.equal(isKnownAgentId(id), true);
      assert.ok(getActiveAgent(id));
    }
  });

  it("rejects unknown agent ids", () => {
    assert.equal(isKnownAgentId("NOT_AN_AGENT"), false);
    assert.equal(getActiveAgent("NOT_AN_AGENT" as never), null);
  });
});
