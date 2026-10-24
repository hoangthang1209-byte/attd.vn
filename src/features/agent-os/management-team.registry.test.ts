import assert from "node:assert/strict";
import test from "node:test";
import {
  MANAGEMENT_TEAM_REGISTRY,
  assertManagementTeamRegistry,
  getManagementAgent,
} from "@/features/agent-os/management-team.registry";

test("management team has exactly one chief of staff and seven managers", () => {
  assert.doesNotThrow(() => assertManagementTeamRegistry());
  assert.equal(MANAGEMENT_TEAM_REGISTRY.length, 8);
  assert.equal(MANAGEMENT_TEAM_REGISTRY.filter((agent) => agent.id === "CHIEF_OF_STAFF").length, 1);
});

test("technology manager reuses current technical Agent OS workers", () => {
  const technology = getManagementAgent("TECHNOLOGY_MANAGER");
  assert.deepEqual(technology.delegatedWorkerAgents, [
    "ATTD_CTO",
    "CRM_AGENT",
    "PRICING_QUOTATION_AGENT",
    "PUBLIC_WEBSITE_AGENT",
    "SEO_AGENT",
    "QA_AGENT",
    "DEPLOYMENT_AGENT",
    "RELIABILITY_AGENT",
  ]);
});

test("finance manager remains human-gated for commercial risk", () => {
  const finance = getManagementAgent("FINANCE_MANAGER");
  assert.equal(finance.approvalMode, "HUMAN_ONLY");
});
