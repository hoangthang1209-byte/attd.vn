import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  parseAgentRunsIssueNumber,
  parseAgentRunsLimit,
} from "@/features/agent-os/agent-run.query";

describe("agent run query parsing", () => {
  it("parses valid issue numbers", () => {
    assert.equal(parseAgentRunsIssueNumber("186"), 186);
  });

  it("rejects invalid issue numbers", () => {
    assert.equal(parseAgentRunsIssueNumber(null), null);
    assert.equal(parseAgentRunsIssueNumber("0"), null);
    assert.equal(parseAgentRunsIssueNumber("abc"), null);
  });

  it("parses optional limit", () => {
    assert.equal(parseAgentRunsLimit("20"), 20);
    assert.equal(parseAgentRunsLimit(null), undefined);
    assert.equal(parseAgentRunsLimit("-1"), undefined);
  });
});
