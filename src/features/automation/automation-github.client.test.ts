import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AUTOMATION_STATUS_GITHUB_LABELS } from "@/features/automation/automation-status.parser";
import {
  buildAutomationSearchQueries,
  hasAnyAutomationStatusLabel,
  HISTORICAL_AUTOMATION_STATUS_LABELS,
} from "@/features/automation/automation-github.queries";

describe("automation GitHub client search strategy", () => {
  it("uses exactly two label-free Search API queries on cache miss", () => {
    const queries = buildAutomationSearchQueries(
      "hoangthang1209-byte",
      "attd.vn",
      AUTOMATION_STATUS_GITHUB_LABELS,
      new Date("2026-09-20T12:00:00.000Z"),
    );

    assert.equal(queries.length, 2);
    assert.equal(
      queries[0],
      "repo:hoangthang1209-byte/attd.vn is:issue is:open",
    );
    assert.match(queries[1], /^repo:hoangthang1209-byte\/attd\.vn is:issue is:closed closed:>=/);
  });

  it("does not use OR between label qualifiers in Search queries", () => {
    const queries = buildAutomationSearchQueries(
      "hoangthang1209-byte",
      "attd.vn",
      AUTOMATION_STATUS_GITHUB_LABELS,
    );

    for (const query of queries) {
      assert.doesNotMatch(query, /label:/);
      assert.doesNotMatch(query, /\bOR\b/);
    }
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

describe("automation GitHub client-side label filtering", () => {
  it("retains open issues carrying automation status labels", () => {
    assert.ok(
      hasAnyAutomationStatusLabel(
        { labels: [{ name: "status:pr-open" }] },
        AUTOMATION_STATUS_GITHUB_LABELS,
      ),
    );
    assert.ok(
      hasAnyAutomationStatusLabel(
        { labels: [{ name: "status:building" }] },
        AUTOMATION_STATUS_GITHUB_LABELS,
      ),
    );
    assert.ok(
      hasAnyAutomationStatusLabel(
        { labels: [{ name: "bug" }, { name: "status:ci-review" }] },
        AUTOMATION_STATUS_GITHUB_LABELS,
      ),
    );
  });

  it("filters out open issues without automation status labels", () => {
    assert.equal(
      hasAnyAutomationStatusLabel({ labels: [{ name: "bug" }] }, AUTOMATION_STATUS_GITHUB_LABELS),
      false,
    );
    assert.equal(
      hasAnyAutomationStatusLabel({ labels: [] }, AUTOMATION_STATUS_GITHUB_LABELS),
      false,
    );
  });

  it("retains recent closed merged and superseded issues only", () => {
    assert.ok(
      hasAnyAutomationStatusLabel(
        { labels: [{ name: "status:merged" }] },
        HISTORICAL_AUTOMATION_STATUS_LABELS,
      ),
    );
    assert.ok(
      hasAnyAutomationStatusLabel(
        { labels: [{ name: "status:superseded" }] },
        HISTORICAL_AUTOMATION_STATUS_LABELS,
      ),
    );
    assert.equal(
      hasAnyAutomationStatusLabel(
        { labels: [{ name: "status:building" }] },
        HISTORICAL_AUTOMATION_STATUS_LABELS,
      ),
      false,
    );
  });
});
