import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseAgentIssueMetadata } from "@/features/agent-os/agent-metadata.parser";

describe("parseAgentIssueMetadata", () => {
  it("returns empty metadata when no markers exist", () => {
    const parsed = parseAgentIssueMetadata({
      body: "## Goal\nShip dashboard polish.",
      comments: [{ body: "TASK_AREA: Automation Platform" }],
    });
    assert.equal(parsed.agentOverride, null);
    assert.equal(parsed.agentOverrideValid, false);
    assert.equal(parsed.taskAreaOverride, null);
    assert.equal(parsed.priority, null);
    assert.equal(parsed.parentTaskIssueNumber, null);
  });

  it("parses ATTD_* lines from issue body", () => {
    const parsed = parseAgentIssueMetadata({
      body: [
        "ATTD_AGENT: PUBLIC_WEBSITE_AGENT",
        "ATTD_AREA: PUBLIC_UI",
        "ATTD_PRIORITY: P1",
        "ATTD_PARENT_TASK: #123",
      ].join("\n"),
    });
    assert.equal(parsed.agentOverride, "PUBLIC_WEBSITE_AGENT");
    assert.equal(parsed.agentOverrideValid, true);
    assert.equal(parsed.taskAreaOverride, "PUBLIC_UI");
    assert.equal(parsed.priority, "P1");
    assert.equal(parsed.parentTaskIssueNumber, 123);
  });

  it("treats invalid agent overrides as invalid without throwing", () => {
    const parsed = parseAgentIssueMetadata({
      body: "ATTD_AGENT: UNKNOWN_AGENT",
    });
    assert.equal(parsed.agentOverride, "UNKNOWN_AGENT");
    assert.equal(parsed.agentOverrideValid, false);
  });

  it("lets later comments override earlier body metadata", () => {
    const parsed = parseAgentIssueMetadata({
      body: "ATTD_AGENT: CRM_AGENT\nATTD_PRIORITY: P3",
      comments: [{ body: "ATTD_AGENT: SEO_AGENT\nATTD_PRIORITY: P1" }],
    });
    assert.equal(parsed.agentOverride, "SEO_AGENT");
    assert.equal(parsed.agentOverrideValid, true);
    assert.equal(parsed.priority, "P1");
  });

  it("ignores malformed priority and parent task values", () => {
    const parsed = parseAgentIssueMetadata({
      body: "ATTD_PRIORITY: urgent\nATTD_PARENT_TASK: not-a-number",
    });
    assert.equal(parsed.priority, null);
    assert.equal(parsed.parentTaskIssueNumber, null);
  });
});
