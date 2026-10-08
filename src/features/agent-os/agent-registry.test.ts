import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AGENT_REGISTRY,
  agentSupportsTaskArea,
  assertRegistryInvariants,
  detectAgentOverrideAreaMismatch,
  getActiveAgent,
  getAgentById,
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

  it("matches agent allowed task areas by lane label or id", () => {
    const crm = getAgentById("CRM_AGENT");
    assert.equal(agentSupportsTaskArea(crm, "Lead & Sales / CRM"), true);
    assert.equal(agentSupportsTaskArea(crm, "lead-sales-crm"), true);
    assert.equal(agentSupportsTaskArea(crm, "Marketing / Content / SEO"), false);
    assert.equal(agentSupportsTaskArea(crm, "Chưa phân loại"), false);
  });

  it("detects override mismatch from ATTD_AREA when TASK_AREA is unclassified", () => {
    const qa = getAgentById("QA_AGENT");
    assert.equal(
      detectAgentOverrideAreaMismatch(qa, "Marketing / Content / SEO", "Chưa phân loại"),
      true,
    );
    assert.equal(
      detectAgentOverrideAreaMismatch(qa, "Chưa phân loại", "Chưa phân loại"),
      false,
    );
  });

  it("detects override mismatch from legacy TASK_AREA when effective area is unclassified", () => {
    const qa = getAgentById("QA_AGENT");
    assert.equal(
      detectAgentOverrideAreaMismatch(qa, "Chưa phân loại", "Marketing / Content / SEO"),
      true,
    );
  });
});
