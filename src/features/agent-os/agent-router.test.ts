import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { routeAutomationTask } from "@/features/agent-os/agent-router";

describe("routeAutomationTask", () => {
  it("escalates high-risk labels to ATTD_CTO", () => {
    const result = routeAutomationTask({
      title: "Dashboard polish",
      body: null,
      comments: [],
      taskArea: "Automation Platform",
      risk: "high",
    });
    assert.equal(result.agentId, "ATTD_CTO");
    assert.equal(result.reason, "high_risk_escalation");
    assert.equal(result.requiresHumanEscalation, true);
  });

  it("escalates pricing keywords even when risk label is unknown", () => {
    const result = routeAutomationTask({
      title: "Adjust pricing engine margin rules",
      body: null,
      comments: [],
      taskArea: "Quotation / Quote Builder",
      risk: "unknown",
    });
    assert.equal(result.agentId, "ATTD_CTO");
    assert.equal(result.requiresHumanEscalation, true);
  });

  it("honors valid ATTD_AGENT override when not high risk", () => {
    const result = routeAutomationTask({
      title: "Homepage hero",
      body: "ATTD_AGENT: PUBLIC_WEBSITE_AGENT",
      comments: [],
      taskArea: "Chưa phân loại",
      risk: "low",
    });
    assert.equal(result.agentId, "PUBLIC_WEBSITE_AGENT");
    assert.equal(result.reason, "metadata_agent_override");
  });

  it("ignores invalid ATTD_AGENT override and falls back to task area", () => {
    const result = routeAutomationTask({
      title: "CRM lead list",
      body: "ATTD_AGENT: BOGUS_AGENT",
      comments: [],
      taskArea: "Lead & Sales / CRM",
      risk: "low",
    });
    assert.equal(result.agentId, "CRM_AGENT");
    assert.equal(result.reason, "task_area");
  });

  it("prefers explicit override over task area when both exist", () => {
    const result = routeAutomationTask({
      title: "SEO landing copy",
      body: "ATTD_AGENT: QA_AGENT",
      comments: [],
      taskArea: "Marketing / Content / SEO",
      risk: "low",
    });
    assert.equal(result.agentId, "QA_AGENT");
    assert.equal(result.reason, "metadata_agent_override");
  });

  it("uses keyword fallback when area is unclassified", () => {
    const result = routeAutomationTask({
      title: "Improve SEO metadata on blog",
      body: null,
      comments: [],
      taskArea: "Chưa phân loại",
      risk: "low",
    });
    assert.equal(result.agentId, "SEO_AGENT");
    assert.equal(result.reason, "keyword_fallback");
  });

  it("high risk wins over metadata agent override", () => {
    const result = routeAutomationTask({
      title: "Payment webhook",
      body: "ATTD_AGENT: CRM_AGENT",
      comments: [],
      taskArea: "Lead & Sales",
      risk: "high",
    });
    assert.equal(result.agentId, "ATTD_CTO");
    assert.equal(result.reason, "high_risk_escalation");
  });

  it("flags human escalation for risk:medium without changing specialist assignment", () => {
    const result = routeAutomationTask({
      title: "CRM lead filters",
      body: null,
      comments: [],
      taskArea: "Lead & Sales / CRM",
      risk: "medium",
    });
    assert.equal(result.agentId, "CRM_AGENT");
    assert.equal(result.reason, "task_area");
    assert.equal(result.requiresHumanEscalation, true);
  });

  it("flags human escalation for quotation lane even when risk is low", () => {
    const result = routeAutomationTask({
      title: "Quote builder polish",
      body: null,
      comments: [],
      taskArea: "Quotation / Quote Builder",
      risk: "low",
    });
    assert.equal(result.agentId, "PRICING_QUOTATION_AGENT");
    assert.equal(result.requiresHumanEscalation, true);
  });

  it("flags ATTD_AGENT override mismatch with task area", () => {
    const result = routeAutomationTask({
      title: "SEO landing copy",
      body: "ATTD_AGENT: QA_AGENT",
      comments: [],
      taskArea: "Marketing / Content / SEO",
      risk: "low",
    });
    assert.equal(result.agentId, "QA_AGENT");
    assert.equal(result.reason, "metadata_agent_override");
    assert.equal(result.agentOverrideAreaMismatch, true);
  });
  it("flags override mismatch from keyword context when task area is unclassified", () => {
    const result = routeAutomationTask({
      title: "Improve SEO metadata on blog",
      body: "ATTD_AGENT: QA_AGENT",
      comments: [],
      taskArea: "Chưa phân loại",
      risk: "low",
    });
    assert.equal(result.agentId, "QA_AGENT");
    assert.equal(result.reason, "metadata_agent_override");
    assert.equal(result.agentOverrideAreaMismatch, true);
  });

  it("does not force CTO routing for low-risk authorization or migration notes", () => {
    const authorization = routeAutomationTask({
      title: "CRM lead filters",
      body: "Verify authorization checks in the admin surface",
      comments: [],
      taskArea: "Lead & Sales / CRM",
      risk: "low",
    });
    assert.equal(authorization.agentId, "CRM_AGENT");
    assert.equal(authorization.reason, "task_area");

    const migration = routeAutomationTask({
      title: "Automation docs cleanup",
      body: "Document migration notes only; no destructive migration",
      comments: [],
      taskArea: "Automation Platform",
      risk: "low",
    });
    assert.equal(migration.agentId, "ATTD_CTO");
    assert.notEqual(migration.reason, "high_risk_escalation");
  });

});
