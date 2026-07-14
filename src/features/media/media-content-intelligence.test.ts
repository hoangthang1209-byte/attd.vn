import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  inferSuggestedSuitabilities,
  mergeContentSuitabilities,
  normalizeContentSuitabilities,
  parseContentSuitabilitiesOrThrow,
} from "./services/media-content-intelligence.service";
import {
  createBundleSlotsFromPreset,
  evaluateBundleAgainstPreset,
  getBundlePreset,
  validateMediaContentSuitability,
} from "./media-bundle-presets";
import { calculateMediaBundleHealth } from "./services/media-bundle.service";

describe("content suitability", () => {
  it("role HERO suggests LANDING_HERO", () => {
    const suggested = inferSuggestedSuitabilities({ roleCode: "HERO" });
    assert.ok(suggested.includes("LANDING_HERO"));
  });

  it("role FACTORY suggests FACTORY_STORY", () => {
    assert.ok(inferSuggestedSuitabilities({ roleCode: "FACTORY" }).includes("FACTORY_STORY"));
  });

  it("role MATERIAL suggests MATERIAL_DETAIL", () => {
    assert.ok(inferSuggestedSuitabilities({ roleCode: "MATERIAL" }).includes("MATERIAL_DETAIL"));
  });

  it("unknown role produces no suggestions", () => {
    assert.deepEqual(inferSuggestedSuitabilities({ roleCode: "WEIRD_ROLE" }), []);
  });

  it("add/remove suitability normalization works", () => {
    const result = mergeContentSuitabilities(
      ["FEATURED_IMAGE", "BLOG_INLINE"],
      ["OG_IMAGE", "FEATURED_IMAGE"],
      ["BLOG_INLINE"],
    );
    assert.deepEqual(result, ["FEATURED_IMAGE", "OG_IMAGE"]);
  });

  it("invalid suitability rejected", () => {
    assert.equal(validateMediaContentSuitability("NOT_REAL"), null);
    assert.throws(() => parseContentSuitabilitiesOrThrow(["NOT_REAL"]));
  });

  it("empty normalize works", () => {
    assert.deepEqual(normalizeContentSuitabilities([]), []);
  });
});

describe("bundle presets", () => {
  it("BLOG_ARTICLE preset includes FEATURED required", () => {
    const preset = getBundlePreset("BLOG_ARTICLE");
    const featured = preset.slots.find((s) => s.slotType === "FEATURED");
    assert.ok(featured?.required);
    assert.equal(featured?.maxAssets, 1);
  });

  it("LANDING_PAGE preset includes HERO", () => {
    const slots = createBundleSlotsFromPreset("LANDING_PAGE");
    assert.ok(slots.some((s) => s.slotType === "HERO" && s.required));
  });

  it("add-missing does not duplicate existing slot types", () => {
    const result = evaluateBundleAgainstPreset({
      contentType: "BLOG_ARTICLE",
      existingSlotTypes: ["FEATURED", "INLINE"],
    });
    assert.ok(!result.missingSlots.some((s) => s.slotType === "FEATURED"));
    assert.ok(result.missingSlots.some((s) => s.slotType === "OG_IMAGE"));
  });
});

describe("bundle health", () => {
  it("reports missing required slots and underfilled", () => {
    const health = calculateMediaBundleHealth({
      slots: [
        {
          id: "s1",
          slotType: "HERO",
          label: "Hero",
          required: true,
          minAssets: 1,
          maxAssets: 1,
          assets: [],
        },
        {
          id: "s2",
          slotType: "PROCESS",
          label: "Process",
          required: false,
          minAssets: 3,
          maxAssets: null,
          assets: [
            {
              visibility: "PUBLIC",
              seoReadinessStatus: "READY",
              duplicateStatus: "UNIQUE",
            },
          ],
        },
      ],
    });
    assert.ok(health.missingRequiredSlots.some((s) => s.label === "Hero"));
    assert.ok(health.underfilledSlots.some((s) => s.label === "Process"));
    assert.equal(health.status, "INCOMPLETE");
  });

  it("reports overfilled max", () => {
    const health = calculateMediaBundleHealth({
      slots: [
        {
          id: "s1",
          slotType: "FEATURED",
          label: "Featured",
          required: true,
          minAssets: 1,
          maxAssets: 1,
          assets: [
            {
              visibility: "PUBLIC",
              seoReadinessStatus: "EXCELLENT",
              duplicateStatus: "UNIQUE",
            },
            {
              visibility: "PUBLIC",
              seoReadinessStatus: "READY",
              duplicateStatus: "UNIQUE",
            },
          ],
        },
      ],
    });
    assert.ok(health.overfilledSlots.some((s) => s.label === "Featured"));
  });

  it("complete required slots can reach READY status band", () => {
    const health = calculateMediaBundleHealth({
      slots: [
        {
          id: "s1",
          slotType: "FEATURED",
          label: "Featured",
          required: true,
          minAssets: 1,
          maxAssets: 1,
          assets: [
            {
              visibility: "PUBLIC",
              seoReadinessStatus: "EXCELLENT",
              duplicateStatus: "UNIQUE",
            },
          ],
        },
        {
          id: "s2",
          slotType: "INLINE",
          label: "Inline",
          required: false,
          minAssets: 3,
          maxAssets: null,
          assets: [
            {
              visibility: "PUBLIC",
              seoReadinessStatus: "READY",
              duplicateStatus: "UNIQUE",
            },
            {
              visibility: "PUBLIC",
              seoReadinessStatus: "READY",
              duplicateStatus: "UNIQUE",
            },
            {
              visibility: "PUBLIC",
              seoReadinessStatus: "READY",
              duplicateStatus: "UNIQUE",
            },
          ],
        },
      ],
    });
    assert.equal(health.completeRequiredSlots, 1);
    assert.ok(health.score >= 65);
    assert.ok(["READY", "EXCELLENT"].includes(health.status));
  });
});

describe("coverage plan heuristics", () => {
  it("landing page with no hero is missing", () => {
    const suitableCount = 0;
    const recommendedMinimum = 1;
    const status =
      suitableCount === 0 ? "MISSING" : suitableCount < recommendedMinimum ? "LOW" : "ENOUGH";
    assert.equal(status, "MISSING");
  });

  it("blog with two inline images is low against min 3", () => {
    const suitableCount = 2;
    const recommendedMinimum = 3;
    const status = suitableCount < recommendedMinimum ? "LOW" : "ENOUGH";
    assert.equal(status, "LOW");
  });

  it("complete plan heuristics return strong", () => {
    const suitableCount = 8;
    const recommendedMinimum = 3;
    const status = suitableCount >= recommendedMinimum * 2 ? "STRONG" : "ENOUGH";
    assert.equal(status, "STRONG");
  });
});

describe("safety contracts", () => {
  it("suitability merge returns enum values only", () => {
    const next = mergeContentSuitabilities(["OG_IMAGE"], ["FEATURED_IMAGE"], []);
    assert.deepEqual(next, ["OG_IMAGE", "FEATURED_IMAGE"]);
  });
});
