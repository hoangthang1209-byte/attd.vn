import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AUTOMATION_STATUS_GITHUB_LABELS } from "@/features/automation/automation-status.parser";
import { buildAutomationSearchQueries } from "@/features/automation/automation-github.queries";

describe("automation GitHub client search strategy", () => {
  it("uses a fixed number of consolidated Search API queries regardless of label count", () => {
    const queries = buildAutomationSearchQueries(
      "hoangthang1209-byte",
      "attd.vn",
      AUTOMATION_STATUS_GITHUB_LABELS,
      new Date("2026-09-20T12:00:00.000Z"),
    );

    assert.equal(queries.length, 2);
    assert.match(queries[0], /^repo:hoangthang1209-byte\/attd\.vn is:issue is:open \(/);
    assert.match(queries[0], /label:"status:building"/);
    assert.match(queries[0], /label:"status:queued"/);
    assert.doesNotMatch(queries[0], /label:"status:merged"/);
    assert.match(queries[1], /^repo:hoangthang1209-byte\/attd\.vn is:issue is:closed \(/);
    assert.match(queries[1], /label:"status:merged"/);
    assert.match(queries[1], /closed:>=/);
  });

  it("does not grow Search API query count as more status labels are tracked", () => {
    const smallLabelSet = ["status:building", "status:queued"] as const;
    const largeLabelSet = AUTOMATION_STATUS_GITHUB_LABELS;

    assert.equal(
      buildAutomationSearchQueries("owner", "repo", smallLabelSet).length,
      buildAutomationSearchQueries("owner", "repo", largeLabelSet).length,
    );
  });
});
