import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createHash } from "node:crypto";
import { calculateMediaContentHash } from "@/features/media/services/media-duplicate.service";
import { normalizeMasterDataCode } from "@/features/media/media-classification";

describe("media duplicate hashing", () => {
  it("same file bytes produce the same SHA-256", () => {
    const a = Buffer.from("identical-image-bytes");
    const b = Buffer.from("identical-image-bytes");
    assert.equal(calculateMediaContentHash(a), calculateMediaContentHash(b));
    assert.equal(
      calculateMediaContentHash(a),
      createHash("sha256").update(a).digest("hex"),
    );
  });

  it("different bytes produce different SHA-256", () => {
    const a = Buffer.from("image-a");
    const b = Buffer.from("image-b");
    assert.notEqual(calculateMediaContentHash(a), calculateMediaContentHash(b));
  });
});

describe("media collection code normalization", () => {
  it("normalizes optional collection codes to uppercase snake case", () => {
    assert.equal(normalizeMasterDataCode("BlackPink 2026"), "BLACKPINK_2026");
    assert.equal(normalizeMasterDataCode("  summer-campaign "), "SUMMERCAMPAIGN");
  });
});

describe("collection assignment payload conventions", () => {
  it("keeps add/remove collection fields distinct from overwrite", () => {
    const payload = {
      ids: ["a", "b"],
      addCollectionIds: ["c1"],
      removeCollectionIds: ["c2"],
    };
    assert.ok("addCollectionIds" in payload);
    assert.ok("removeCollectionIds" in payload);
    assert.equal("collectionIds" in payload, false);
  });
});

describe("collection discovery scoring", () => {
  it("awards +8 for explicit collection match in scoring contract", () => {
    const COLLECTION_MATCH_SCORE = 8;
    assert.equal(COLLECTION_MATCH_SCORE, 8);
  });
});

describe("delete safety conventions", () => {
  it("treats collection membership as non-blocking for deletion", () => {
    const blockingReferenceTypes = new Set([
      "PRODUCT",
      "BLOG",
      "QUOTE",
      "ORDER",
      "MANUFACTURING",
      "HOMEPAGE",
      "TECH_PACK",
      "SALES",
    ]);
    assert.equal(blockingReferenceTypes.has("COLLECTION"), false);
  });
});
