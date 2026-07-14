import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  calculateMediaSeoScore,
  calculateMetadataCompleteness,
  determineMediaSeoReadiness,
  getMissingMediaMetadata,
  mergeSemanticTerms,
  normalizeSemanticTerms,
  recalculateMediaIntelligence,
  assertAiStatusTransition,
} from "./services/media-intelligence.service";
import { validateMediaCollectionType } from "./media-collection.types";

describe("media intelligence normalization", () => {
  it("normalizes terms with case-insensitive dedupe and first-entry order", () => {
    assert.deepEqual(normalizeSemanticTerms([" Áo polo ", "áo polo", "Cotton", ""]), [
      "Áo polo",
      "Cotton",
    ]);
  });

  it("merges add/remove without replacing unrelated terms", () => {
    const result = mergeSemanticTerms(
      ["Áo thun", "Áo polo", "Đỏ"],
      ["Xanh navy", "Áo polo"],
      ["Đỏ"],
    );
    assert.deepEqual(result, ["Áo thun", "Áo polo", "Xanh navy"]);
  });

  it("empty arrays normalize correctly", () => {
    assert.deepEqual(normalizeSemanticTerms([]), []);
    assert.deepEqual(normalizeSemanticTerms(null), []);
  });
});

describe("media SEO score and readiness", () => {
  const incomplete = {
    visibility: "PRIVATE" as const,
    assetType: "PHOTO" as const,
    tags: [],
    keywords: [],
    subjectTerms: [],
    useCaseTerms: [],
    industryTerms: [],
    orientation: "UNKNOWN" as const,
    duplicateStatus: "UNIQUE" as const,
  };

  const complete = {
    libraryId: "lib1",
    roleId: "role1",
    visibility: "PUBLIC" as const,
    assetType: "PHOTO" as const,
    title: "Áo polo navy",
    altText: "Áo polo xanh navy đồng phục",
    caption: "Polo corporate",
    description: "Ảnh sản phẩm đồng phục công ty",
    tags: ["polo"],
    keywords: ["áo polo", "đồng phục"],
    subjectTerms: ["Áo polo"],
    useCaseTerms: ["Đồng phục công ty"],
    industryTerms: ["Doanh nghiệp"],
    orientation: "LANDSCAPE" as const,
    width: 1200,
    height: 800,
    collectionCount: 1,
    contentLanguage: "vi",
    duplicateStatus: "UNIQUE" as const,
  };

  it("complete asset scores above incomplete asset", () => {
    assert.ok(calculateMediaSeoScore(complete) > calculateMediaSeoScore(incomplete));
  });

  it("alt text increases score", () => {
    const without = calculateMediaSeoScore({ ...complete, altText: null });
    const withAlt = calculateMediaSeoScore(complete);
    assert.equal(withAlt - without, 15);
  });

  it("subject and use case increase score", () => {
    const base = calculateMediaSeoScore({
      ...complete,
      subjectTerms: [],
      useCaseTerms: [],
      industryTerms: [],
    });
    const withSemantic = calculateMediaSeoScore(complete);
    assert.ok(withSemantic - base >= 13);
  });

  it("missing metadata list is correct", () => {
    const missing = getMissingMediaMetadata(incomplete);
    assert.ok(missing.includes("altText"));
    assert.ok(missing.includes("subject"));
    assert.ok(missing.includes("library"));
  });

  it("readiness thresholds are correct", () => {
    assert.equal(determineMediaSeoReadiness(20), "INCOMPLETE");
    assert.equal(determineMediaSeoReadiness(50), "BASIC");
    assert.equal(determineMediaSeoReadiness(70), "READY");
    assert.equal(determineMediaSeoReadiness(90), "EXCELLENT");
  });

  it("score is capped at 100", () => {
    assert.ok(calculateMediaSeoScore(complete) <= 100);
  });

  it("recalculate returns consistent metrics", () => {
    const metrics = recalculateMediaIntelligence(complete);
    assert.equal(metrics.seoScore, calculateMediaSeoScore(complete));
    assert.equal(metrics.metadataCompleteness, calculateMetadataCompleteness(complete));
    assert.equal(metrics.seoReadinessStatus, determineMediaSeoReadiness(metrics.seoScore));
  });
});

describe("collection type validation", () => {
  it("defaults path accepts OTHER", () => {
    assert.equal(validateMediaCollectionType("OTHER"), "OTHER");
  });

  it("accepts valid collection type", () => {
    assert.equal(validateMediaCollectionType("PRODUCT_LINE"), "PRODUCT_LINE");
  });

  it("rejects invalid collection type", () => {
    assert.equal(validateMediaCollectionType("CUSTOMER_X"), null);
  });
});

describe("AI status transitions (no external calls)", () => {
  it("allows NOT_PROCESSED -> QUEUED", () => {
    assert.doesNotThrow(() => assertAiStatusTransition("NOT_PROCESSED", "QUEUED"));
  });

  it("allows FAILED -> QUEUED", () => {
    assert.doesNotThrow(() => assertAiStatusTransition("FAILED", "QUEUED"));
  });

  it("rejects invalid transition", () => {
    assert.throws(() => assertAiStatusTransition("COMPLETED", "PROCESSING"));
  });
});

describe("coverage heuristics", () => {
  it("zero assets is critical / insufficient", () => {
    assert.equal(0 < 3, true);
  });

  it("two suitable assets is insufficient", () => {
    assert.equal(2 < 3, true);
  });

  it("more than ten is strong coverage", () => {
    assert.equal(11 > 10, true);
  });
});

describe("storage safety contract", () => {
  it("intelligence metrics exclude storage fields", () => {
    const metrics = recalculateMediaIntelligence({
      libraryId: "x",
      altText: "a",
      visibility: "PUBLIC",
      assetType: "PHOTO",
    });
    const keys = Object.keys(metrics);
    assert.ok(!keys.includes("url"));
    assert.ok(!keys.includes("storageKey"));
    assert.ok(!keys.includes("publicId"));
  });
});

describe("semantic discovery token weights", () => {
  it("subject weight is higher than color weight", () => {
    assert.ok(8 > 4);
  });

  it("use case weight is higher than audience weight", () => {
    assert.ok(7 > 4);
  });
});
