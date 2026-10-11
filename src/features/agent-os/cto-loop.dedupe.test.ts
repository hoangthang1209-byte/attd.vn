import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildPostBuildApprovedDedupeKey,
  detectNoProgressLoop,
  isOrphanedPendingActionSlot,
  shouldSkipDuplicateAction,
  shouldSuppressDuplicateBuildApproved,
  CTO_MAX_NO_PROGRESS_ATTEMPTS,
} from "@/features/agent-os/cto-loop.dedupe";

describe("CTO loop dedupe", () => {
  it("builds stable BUILD_APPROVED dedupe keys", () => {
    const a = buildPostBuildApprovedDedupeKey({
      issueNumber: 10,
      prNumber: 2,
      prHeadSha: "abc123",
      reviewState: "approved",
      ciStatus: "success",
    });
    const b = buildPostBuildApprovedDedupeKey({
      issueNumber: 10,
      prNumber: 2,
      prHeadSha: "abc123",
      reviewState: "approved",
      ciStatus: "success",
    });
    assert.equal(a, b);
  });

  it("suppresses duplicate BUILD_APPROVED when unchanged", () => {
    const key = buildPostBuildApprovedDedupeKey({
      issueNumber: 10,
      prNumber: null,
      prHeadSha: null,
      reviewState: null,
      ciStatus: null,
    });
    assert.equal(
      shouldSuppressDuplicateBuildApproved({
        hasBuildApproved: false,
        proposedKey: key,
        lastActionIdempotencyKey: key,
      }),
      true,
    );
  });

  it("detects no-progress loops at configured threshold", () => {
    assert.equal(detectNoProgressLoop(CTO_MAX_NO_PROGRESS_ATTEMPTS - 1), false);
    assert.equal(detectNoProgressLoop(CTO_MAX_NO_PROGRESS_ATTEMPTS), true);
  });

  it("skips duplicate action idempotency keys", () => {
    assert.equal(
      shouldSkipDuplicateAction({
        lastActionIdempotencyKey: "cto-g3:assign:1",
        attemptCountWithoutProgress: 0,
        hasActiveNonTerminalRun: false,
        duplicateSourceEvent: false,
        proposedActionIdempotencyKey: "cto-g3:assign:1",
      }),
      true,
    );
  });

  it("detects orphaned pending slots without a persisted last action key", () => {
    assert.equal(
      isOrphanedPendingActionSlot({
        pendingActionKey: "cto-g3:post-build-approved:1",
        lastActionKey: null,
        proposedKey: "cto-g3:post-build-approved:1",
      }),
      true,
    );
    assert.equal(
      isOrphanedPendingActionSlot({
        pendingActionKey: "cto-g3:post-build-approved:1",
        lastActionKey: "cto-g3:post-build-approved:1",
        proposedKey: "cto-g3:post-build-approved:1",
      }),
      false,
    );
    assert.equal(
      isOrphanedPendingActionSlot({
        pendingActionKey: "cto-g3:post-build-approved:1",
        lastActionKey: null,
        proposedKey: "cto-g3:other",
      }),
      false,
    );
  });
});
