import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  LIFECYCLE_ALLOWED_TRANSITIONS,
  MediaLifecycleError,
  MEDIA_LIFECYCLE_BULK_MAX,
} from "./lifecycle.types";
import { isLifecycleEligibleForSuggestion } from "./media-dependency.service";
import { classifyUnusedAsset } from "./lifecycle-queue.service";

describe("Sprint 14.5 lifecycle transitions", () => {
  it("allows ACTIVE → REVIEW_REQUIRED / DEPRECATED / ARCHIVED", () => {
    assert.deepEqual(LIFECYCLE_ALLOWED_TRANSITIONS.ACTIVE.sort(), [
      "ARCHIVED",
      "DEPRECATED",
      "REVIEW_REQUIRED",
    ].sort());
  });

  it("allows RETIRED → ACTIVE only", () => {
    assert.deepEqual(LIFECYCLE_ALLOWED_TRANSITIONS.RETIRED, ["ACTIVE"]);
  });

  it("rejects invalid transition via policy table", () => {
    assert.equal(LIFECYCLE_ALLOWED_TRANSITIONS.ACTIVE.includes("RETIRED"), false);
    assert.equal(LIFECYCLE_ALLOWED_TRANSITIONS.ARCHIVED.includes("DEPRECATED"), false);
  });

  it("MediaLifecycleError carries structured code", () => {
    const err = new MediaLifecycleError("REASON_REQUIRED", "need reason");
    assert.equal(err.code, "REASON_REQUIRED");
    assert.equal(err.name, "MediaLifecycleError");
  });

  it("bulk max is 100", () => {
    assert.equal(MEDIA_LIFECYCLE_BULK_MAX, 100);
  });
});

describe("Sprint 14.5 selection eligibility", () => {
  it("blocks archived / retired / deprecated", () => {
    assert.equal(
      isLifecycleEligibleForSuggestion({
        lifecycleStatus: "ARCHIVED",
        visibility: "PUBLIC",
      }).ok,
      false,
    );
    assert.equal(
      isLifecycleEligibleForSuggestion({
        lifecycleStatus: "RETIRED",
        visibility: "PUBLIC",
      }).ok,
      false,
    );
    assert.equal(
      isLifecycleEligibleForSuggestion({
        lifecycleStatus: "DEPRECATED",
        visibility: "PUBLIC",
      }).ok,
      false,
    );
  });

  it("blocks private visibility", () => {
    assert.equal(
      isLifecycleEligibleForSuggestion({
        lifecycleStatus: "ACTIVE",
        visibility: "PRIVATE",
      }).ok,
      false,
    );
  });

  it("allows ACTIVE and warns REVIEW_REQUIRED", () => {
    assert.equal(
      isLifecycleEligibleForSuggestion({
        lifecycleStatus: "ACTIVE",
        visibility: "PUBLIC",
      }).ok,
      true,
    );
    const review = isLifecycleEligibleForSuggestion({
      lifecycleStatus: "REVIEW_REQUIRED",
      visibility: "PUBLIC",
    });
    assert.equal(review.ok, true);
    assert.equal(review.reason, "review_required_warning");
  });

  it("blocks expired restricted licensed assets", () => {
    const result = isLifecycleEligibleForSuggestion({
      lifecycleStatus: "ACTIVE",
      visibility: "PUBLIC",
      rightsStatus: "LICENSED",
      rightsExpiresAt: new Date(Date.now() - 1000),
      usageRestriction: "no-public",
    });
    assert.equal(result.ok, false);
    assert.equal(result.reason, "rights_expired_restricted");
  });
});

describe("Sprint 14.5 unused classification", () => {
  it("protects recent uploads as NEW_UNUSED", () => {
    const state = classifyUnusedAsset({
      createdAt: new Date(),
      lifecycleStatus: "ACTIVE",
      referenceCount: 0,
    });
    assert.equal(state, "NEW_UNUSED");
  });

  it("returns null when references exist", () => {
    assert.equal(
      classifyUnusedAsset({
        createdAt: new Date(0),
        lifecycleStatus: "ACTIVE",
        referenceCount: 2,
      }),
      null,
    );
  });

  it("marks archived unused separately", () => {
    assert.equal(
      classifyUnusedAsset({
        createdAt: new Date(0),
        lifecycleStatus: "ARCHIVED",
        referenceCount: 0,
      }),
      "ARCHIVED_UNUSED",
    );
  });
});

describe("Sprint 14.5 safety invariants (contract)", () => {
  it("does not auto-transition ACTIVE to RETIRED", () => {
    assert.equal(LIFECYCLE_ALLOWED_TRANSITIONS.ACTIVE.includes("RETIRED"), false);
  });

  it("restore from RETIRED requires explicit ACTIVE path only", () => {
    assert.deepEqual(LIFECYCLE_ALLOWED_TRANSITIONS.RETIRED, ["ACTIVE"]);
  });
});
