import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  parseReviewSeverityCounts,
  resolveReviewerStatusFromReviews,
} from "@/features/automation/automation-reviewer";

const attdReviewBody = `<!-- CURSOR_AUTOMATION_ID: test -->
## Independent ATTD PR Review

No P0/P1 findings.

#### P2 — Medium

**1. Example P2 finding**
`;

describe("automation reviewer status", () => {
  it("parses clean P2 review counts", () => {
    assert.deepEqual(parseReviewSeverityCounts(attdReviewBody), {
      p0: 0,
      p1: 0,
      p2: 1,
      p3: 0,
    });
  });

  it("returns needs_fix when P2 remains", () => {
    assert.deepEqual(
      resolveReviewerStatusFromReviews([
        {
          author: "bot",
          body: attdReviewBody,
          state: "COMMENTED",
          submittedAt: "2026-09-21T00:00:00.000Z",
        },
      ]).status,
      "needs_fix",
    );
  });

  it("returns passed when no P0/P1/P2 remain", () => {
    const passedBody = attdReviewBody.replace("#### P2 — Medium\n\n**1. Example P2 finding**", "");
    assert.deepEqual(
      resolveReviewerStatusFromReviews([
        {
          author: "bot",
          body: passedBody,
          state: "COMMENTED",
          submittedAt: "2026-09-21T00:00:00.000Z",
        },
      ]).status,
      "passed",
    );
  });
});
