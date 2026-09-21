import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AUTOMATION_STATUS_GITHUB_LABELS } from "@/features/automation/automation-status.parser";
import {
  buildAutomationSearchQueries,
  countGitHubSearchBooleanOperators,
  findUncoveredAutomationStatusLabels,
  GITHUB_SEARCH_MAX_BOOLEAN_OPERATORS,
} from "@/features/automation/automation-github.queries";

describe("automation GitHub client search strategy", () => {
  it("groups open operational labels so each Search query stays within GitHub boolean operator limit", () => {
    const queries = buildAutomationSearchQueries(
      "hoangthang1209-byte",
      "attd.vn",
      AUTOMATION_STATUS_GITHUB_LABELS,
      new Date("2026-09-20T12:00:00.000Z"),
    );

    assert.ok(queries.length >= 2, "expected grouped open queries plus closed history query");
    for (const query of queries) {
      assert.ok(
        countGitHubSearchBooleanOperators(query) <= GITHUB_SEARCH_MAX_BOOLEAN_OPERATORS,
        `query exceeds operator limit: ${query}`,
      );
    }
  });

  it("covers every configured automation status label across grouped queries", () => {
    const queries = buildAutomationSearchQueries(
      "hoangthang1209-byte",
      "attd.vn",
      AUTOMATION_STATUS_GITHUB_LABELS,
      new Date("2026-09-20T12:00:00.000Z"),
    );

    assert.deepEqual(findUncoveredAutomationStatusLabels(AUTOMATION_STATUS_GITHUB_LABELS, queries), []);
  });

  it("uses separate open and closed history query shapes", () => {
    const queries = buildAutomationSearchQueries(
      "hoangthang1209-byte",
      "attd.vn",
      AUTOMATION_STATUS_GITHUB_LABELS,
      new Date("2026-09-20T12:00:00.000Z"),
    );

    const openQueries = queries.filter((query) => query.includes("is:open"));
    const closedQueries = queries.filter((query) => query.includes("is:closed"));

    assert.ok(openQueries.length >= 1);
    assert.equal(closedQueries.length, 1);

    for (const query of openQueries) {
      assert.match(query, /^repo:hoangthang1209-byte\/attd\.vn is:issue is:open \(/);
      assert.doesNotMatch(query, /label:"status:merged"/);
    }

    assert.ok(openQueries.some((query) => query.includes('label:"status:building"')));
    assert.ok(openQueries.some((query) => query.includes('label:"status:queued"')));

    assert.match(closedQueries[0], /^repo:hoangthang1209-byte\/attd\.vn is:issue is:closed \(/);
    assert.match(closedQueries[0], /label:"status:merged"/);
    assert.match(closedQueries[0], /closed:>=/);
  });

  it("uses far fewer Search queries than tracked status labels", () => {
    const smallLabelSet = ["status:building", "status:queued"] as const;
    const largeLabelSet = AUTOMATION_STATUS_GITHUB_LABELS;

    const smallQueries = buildAutomationSearchQueries("owner", "repo", smallLabelSet);
    const largeQueries = buildAutomationSearchQueries("owner", "repo", largeLabelSet);

    assert.ok(largeQueries.length < largeLabelSet.length);
    assert.ok(largeQueries.length > smallQueries.length);
  });
});

describe("countGitHubSearchBooleanOperators", () => {
  it("counts implicit AND and explicit OR for consolidated automation queries", () => {
    const openQuery =
      'repo:owner/repo is:issue is:open (label:"status:building" OR label:"status:queued")';
    const closedQuery =
      'repo:owner/repo is:issue is:closed (label:"status:merged" OR label:"status:superseded") closed:>=2026-08-21';

    assert.equal(countGitHubSearchBooleanOperators(openQuery), 4);
    assert.equal(countGitHubSearchBooleanOperators(closedQuery), 5);
  });

  it("detects the operator overflow that caused GitHub API 422 in production", () => {
    const overflowingOpenQuery = `repo:owner/repo is:issue is:open (${AUTOMATION_STATUS_GITHUB_LABELS.filter(
      (label) => label !== "status:merged" && label !== "status:superseded",
    )
      .map((label) => `label:"${label}"`)
      .join(" OR ")})`;

    assert.ok(
      countGitHubSearchBooleanOperators(overflowingOpenQuery) >
        GITHUB_SEARCH_MAX_BOOLEAN_OPERATORS,
    );
  });
});
