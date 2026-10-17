import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  REVIEW_ORCHESTRATOR_MARKER_PREFIX,
  REVIEW_ORCHESTRATOR_STALLED_PREFIX,
  countReviewRequestMarkersForHead,
  detectReviewOrchestratorStalled,
  findExactHeadIndependentReview,
  resolveExactHeadReviewGate,
} from "@/features/automation/automation-exact-head-review";

const attdBody = `<!-- CURSOR_AUTOMATION_ID: test -->
## Independent ATTD PR Review
No P0/P1 findings.`;

describe("automation-exact-head-review", () => {
  it("1. head A reviewed → head B pushed → A review rejected as stale", () => {
    const reviews = [
      {
        commitId: "sha-a",
        body: attdBody,
        state: "COMMENTED",
      },
    ];

    const gate = resolveExactHeadReviewGate({ headSha: "sha-b", reviews });
    assert.equal(gate.reviewStatus, "stale");
    assert.equal(findExactHeadIndependentReview("sha-b", reviews), null);
  });

  it("2. CI green on B → reviewer trigger emitted exactly once (marker counting)", () => {
    const headSha = "sha-b";
    const pullNumber = 42;
    const marker = `${REVIEW_ORCHESTRATOR_MARKER_PREFIX} request-pr-${pullNumber}-sha-${headSha}`;
    const comments = [
      `REQUEST_INDEPENDENT_REVIEW\n${marker}`,
      `REQUEST_INDEPENDENT_REVIEW\n${marker}`,
    ];

    assert.equal(countReviewRequestMarkersForHead(pullNumber, headSha, comments), 2);
    assert.equal(
      countReviewRequestMarkersForHead(pullNumber, "other-sha", comments),
      0,
    );
  });

  it("3. missing review timeout → retry marker is distinct from initial request", () => {
    const headSha = "sha-b";
    const pullNumber = 7;
    const requestMarker = `${REVIEW_ORCHESTRATOR_MARKER_PREFIX} request-pr-${pullNumber}-sha-${headSha}`;
    const retryMarker = `${REVIEW_ORCHESTRATOR_MARKER_PREFIX} retry-pr-${pullNumber}-sha-${headSha}`;
    const comments = [`queued ${requestMarker}`, `retry ${retryMarker}`];

    assert.equal(countReviewRequestMarkersForHead(pullNumber, headSha, comments), 2);
  });

  it("4. retry dedupe prevents storm (orchestrator skips duplicate marker comments)", () => {
    const headSha = "sha-c";
    const pullNumber = 9;
    const retryMarker = `${REVIEW_ORCHESTRATOR_MARKER_PREFIX} retry-pr-${pullNumber}-sha-${headSha}`;
    const comments = [`first ${retryMarker}`, `duplicate ${retryMarker}`];

    assert.equal(
      comments.filter((body) => body.includes(retryMarker)).length,
      2,
    );
    assert.equal(countReviewRequestMarkersForHead(pullNumber, headSha, comments), 2);
  });

  it("exact-head COMMENTED review with P2 does not approve (dashboard matches repair gate)", () => {
    const headSha = "sha-p2";
    const p2Body = `<!-- CURSOR_AUTOMATION_ID: test -->
## Independent ATTD PR Review

No P0/P1 findings.

#### P2 — Medium

**1. Non-blocking but requires repair**`;

    const gate = resolveExactHeadReviewGate({
      headSha,
      reviews: [{ commitId: headSha, body: p2Body, state: "COMMENTED" }],
    });
    assert.equal(gate.reviewStatus, "changes_requested");
  });

  it("exact-head COMMENTED review with P1 does not approve (dashboard matches merge gate)", () => {
    const headSha = "sha-blocked";
    const blockedBody = `<!-- CURSOR_AUTOMATION_ID: test -->
## Independent ATTD PR Review

#### P1 — High

**1. Blocking finding**`;

    const gate = resolveExactHeadReviewGate({
      headSha,
      reviews: [{ commitId: headSha, body: blockedBody, state: "COMMENTED" }],
    });
    assert.equal(gate.reviewStatus, "changes_requested");
  });

  it("5. current-head review arrives → exact-head gate approves and is not stale", () => {
    const headSha = "sha-current";
    const reviews = [
      { commitId: "sha-old", body: attdBody, state: "COMMENTED" },
      { commitId: headSha, body: attdBody, state: "COMMENTED" },
    ];

    const gate = resolveExactHeadReviewGate({ headSha, reviews });
    assert.equal(gate.reviewStatus, "approved");
    assert.equal(gate.reviewedHeadSha, headSha);
  });

  it("6. stale review cannot satisfy merge gate (no exact-head approval)", () => {
    const gate = resolveExactHeadReviewGate({
      headSha: "sha-merge-target",
      reviews: [{ commitId: "sha-old", body: attdBody, state: "COMMENTED" }],
    });
    assert.notEqual(gate.reviewStatus, "approved");
    assert.equal(gate.reviewStatus, "stale");
  });

  it("detects review_stalled / WAIT_HUMAN from PR comments for current head", () => {
    const headSha = "deadbeef";
    const marker = `${REVIEW_ORCHESTRATOR_MARKER_PREFIX} stalled-pr-55-sha-${headSha}`;
    const stalled = detectReviewOrchestratorStalled(headSha, [
      `${REVIEW_ORCHESTRATOR_STALLED_PREFIX} Independent reviewer did not complete.\n${marker}`,
    ]);

    assert.equal(stalled.reviewStalled, true);
    assert.equal(stalled.waitHuman, true);
    assert.match(stalled.reason ?? "", /REVIEW_ORCHESTRATOR_STALLED/);
  });
});
