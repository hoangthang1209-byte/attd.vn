import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isAttdReviewBlockedByP0P1,
  isAttdReviewBlockedForDashboard,
  parseAttdPrReviewSeverityCounts,
} from "@/features/automation/automation-pr-review-severity";

const cleanReview = `<!-- CURSOR_AUTOMATION_ID: test -->
## Independent ATTD PR Review

No P0/P1 findings.

#### P2 — Medium

**1. Example finding**`;

const blockedReview = `<!-- CURSOR_AUTOMATION_ID: test -->
## Independent ATTD PR Review

### Findings

#### P1 — High

**1. Blocking finding**`;

describe("automation-pr-review-severity", () => {
  it("matches shell parser for clean P2 review", () => {
    const counts = parseAttdPrReviewSeverityCounts(cleanReview);
    assert.equal(counts.p0, 0);
    assert.equal(counts.p1, 0);
    assert.equal(counts.p2, 1);
    assert.equal(isAttdReviewBlockedByP0P1(cleanReview), false);
    assert.equal(isAttdReviewBlockedForDashboard(cleanReview), true);
  });

  it("matches shell parser for P1-blocked review", () => {
    const counts = parseAttdPrReviewSeverityCounts(blockedReview);
    assert.equal(counts.p0, 0);
    assert.equal(counts.p1, 1);
    assert.equal(isAttdReviewBlockedByP0P1(blockedReview), true);
  });
});
