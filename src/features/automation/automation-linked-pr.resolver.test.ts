import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  candidateMentionsClosingIssue,
  dedupeLinkedPullRequestCandidates,
  extractIssueClosedByCommitId,
  selectCanonicalLinkedPullRequestCandidate,
  type LinkedPullRequestCandidate,
} from "@/features/automation/automation-linked-pr.resolver";

function candidate(
  overrides: Partial<LinkedPullRequestCandidate> & Pick<LinkedPullRequestCandidate, "number">,
): LinkedPullRequestCandidate {
  return {
    title: `PR #${overrides.number}`,
    url: `https://github.com/hoangthang1209-byte/attd.vn/pull/${overrides.number}`,
    state: "OPEN",
    updatedAt: "2026-09-21T00:00:00.000Z",
    eventType: "cross-referenced",
    ...overrides,
  };
}

describe("automation linked PR resolver", () => {
  it("detects explicit closing references in PR title and body", () => {
    assert.equal(
      candidateMentionsClosingIssue({ title: "Fixes #85", body: null }, 85),
      true,
    );
    assert.equal(
      candidateMentionsClosingIssue({ title: "Repair", body: "Closes #85" }, 85),
      true,
    );
    assert.equal(
      candidateMentionsClosingIssue({ title: "Mentions #85 only", body: null }, 85),
      false,
    );
  });

  it("extracts issue closed commit id from timeline", () => {
    assert.equal(
      extractIssueClosedByCommitId([
        { event: "cross-referenced" },
        { event: "closed", commit_id: "abc123def456" },
      ]),
      "abc123def456",
    );
    assert.equal(extractIssueClosedByCommitId([{ event: "closed" }]), null);
  });

  it("prefers canonical merged PR over later open cross-reference", () => {
    const selected = selectCanonicalLinkedPullRequestCandidate(
      [
        candidate({
          number: 88,
          state: "OPEN",
          updatedAt: "2026-09-21T12:00:00.000Z",
          body: "Follow-up repair referencing #85",
        }),
        candidate({
          number: 86,
          state: "CLOSED",
          updatedAt: "2026-09-19T10:00:00.000Z",
          merged: true,
          mergeCommitSha: "merge86sha",
          body: "Closes #85",
        }),
      ],
      85,
      "merge86sha",
    );

    assert.equal(selected?.number, 86);
  });

  it("prefers closing PR when only one candidate closes the issue", () => {
    const selected = selectCanonicalLinkedPullRequestCandidate(
      [
        candidate({
          number: 90,
          state: "OPEN",
          updatedAt: "2026-09-21T12:00:00.000Z",
        }),
        candidate({
          number: 87,
          state: "OPEN",
          updatedAt: "2026-09-20T12:00:00.000Z",
          body: "Fixes #85",
        }),
      ],
      85,
      null,
    );

    assert.equal(selected?.number, 87);
  });

  it("falls back to generic cross-reference when no closing PR exists", () => {
    const selected = selectCanonicalLinkedPullRequestCandidate(
      [
        candidate({
          number: 90,
          state: "OPEN",
          updatedAt: "2026-09-21T12:00:00.000Z",
        }),
      ],
      85,
      null,
    );

    assert.equal(selected?.number, 90);
  });

  it("dedupes candidates by PR number keeping the strongest event link", () => {
    const deduped = dedupeLinkedPullRequestCandidates([
      candidate({
        number: 86,
        eventType: "cross-referenced",
        updatedAt: "2026-09-19T10:00:00.000Z",
      }),
      candidate({
        number: 86,
        eventType: "connected",
        updatedAt: "2026-09-18T10:00:00.000Z",
      }),
    ]);

    assert.equal(deduped.length, 1);
    assert.equal(deduped[0]?.eventType, "connected");
  });
});
