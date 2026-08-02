import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DeterministicMediaClassifier } from "./deterministic-classifier";
import { DeterministicMetadataProvider, DeterministicBundleRecommender } from "./deterministic-metadata-provider";
import { calculateAssetHealth } from "./asset-health.service";
import { isAssetReadyForSuggestion } from "./ingest-pipeline.service";

describe("Sprint 14.4 deterministic classifier", () => {
  const classifier = new DeterministicMediaClassifier();

  it("classifies polo product filenames", async () => {
    const result = await classifier.classify({
      filename: "ao-polo-cotton-navy-front.jpg",
      originalName: "áo polo cotton navy",
    });
    assert.ok(result.labels.includes("polo"));
    assert.ok(result.confidence > 0.4);
  });

  it("classifies factory / embroidery technique signals", async () => {
    const result = await classifier.classify({
      filename: "xuong-theu-logo-qc.jpg",
      techniqueTerms: ["embroidery"],
    });
    assert.ok(result.labels.includes("factory") || result.labels.includes("embroidery"));
  });

  it("returns unknown for empty noise", async () => {
    const result = await classifier.classify({ filename: "IMG_0001.jpg" });
    assert.deepEqual(result.labels, ["unknown"]);
  });
});

describe("Sprint 14.4 metadata + bundle suggestion", () => {
  const provider = new DeterministicMetadataProvider();
  const recommender = new DeterministicBundleRecommender();

  it("suggests title alt caption keywords without publishing", async () => {
    const suggested = await provider.suggest({
      filename: "factory-packing-line.jpg",
      width: 1600,
      height: 900,
    });
    assert.equal(suggested.source, "DETERMINISTIC");
    assert.ok(suggested.title);
    assert.ok(suggested.altText);
    assert.ok(suggested.keywords.length > 0);
    assert.ok(suggested.orientation === "LANDSCAPE");
    assert.ok(suggested.suggestedBundleSlots.length > 0);
  });

  it("recommends material/technique slots from labels", async () => {
    const slots = await recommender.recommendSlots({
      labels: ["fabric", "embroidery"],
    });
    assert.ok(slots.includes("MATERIAL") || slots.includes("TECHNIQUE"));
  });
});

describe("Sprint 14.4 asset health", () => {
  it("scores missing alt as accessibility issue without blocking", () => {
    const health = calculateAssetHealth({
      title: "Polo navy",
      altText: null,
      caption: null,
      keywords: ["polo"],
      width: 400,
      height: 400,
      visibility: "INTERNAL",
      seoScore: 40,
    });
    assert.ok(health.total >= 0 && health.total <= 100);
    assert.ok(health.issues.includes("missing_alt"));
    assert.ok(health.accessibility < 50);
  });

  it("rewards complete public assets", () => {
    const health = calculateAssetHealth({
      title: "Áo polo ATTD",
      altText: "Áo polo cotton navy mặt trước",
      caption: "Polo cotton navy",
      keywords: ["polo", "cotton"],
      subjectTerms: ["polo"],
      width: 2000,
      height: 1500,
      orientation: "LANDSCAPE",
      visibility: "PUBLIC",
      contentSuitabilities: ["BLOG_INLINE"],
      seoScore: 90,
      bundleCount: 1,
      usageCount: 3,
      libraryId: "lib",
      roleId: "role",
    });
    assert.ok(health.total >= 70);
    assert.equal(health.grade === "good" || health.grade === "excellent", true);
  });
});

describe("Sprint 14.4 public safety gates", () => {
  it("blocks private and mid-ingest from suggestions", () => {
    assert.equal(isAssetReadyForSuggestion("COMPLETED", "PRIVATE"), false);
    assert.equal(isAssetReadyForSuggestion("PROCESSING", "PUBLIC"), false);
    assert.equal(isAssetReadyForSuggestion("QUEUED", "PUBLIC"), false);
    assert.equal(isAssetReadyForSuggestion("COMPLETED", "PUBLIC"), true);
  });
});

describe("Sprint 14.4 optional AI hooks stay empty by default", () => {
  it("has no registered paid vision providers", async () => {
    const { listRegisteredOptionalAiProviders } = await import("./optional-ai-hooks");
    assert.deepEqual(listRegisteredOptionalAiProviders(), []);
  });
});
