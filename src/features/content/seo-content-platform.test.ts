import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { suggestContentTypeFromIntent } from "@/features/content/seo/seo-intent-guidance";
import { canTransitionTopic, canTransitionStrategy } from "@/features/content/seo/seo-status-transitions";
import { dedupeKeywords, normalizeSeoKeyword, parseBulkKeywordLines } from "@/features/content/seo/seo-keyword-normalize";
import { mapSeoContentTypeToBundleType } from "@/features/content/seo/seo-media-mapping";
import { clampSeoScore, normalizePrimaryKeyword } from "@/features/content/seo/seo-score-utils";

describe("SEO keyword normalize", () => {
  it("preserves Vietnamese accents in normalized form", () => {
    assert.equal(normalizeSeoKeyword("  Áo Polo  Công Ty  "), "áo polo công ty");
  });

  it("bulk paste dedupes case-insensitively", () => {
    const lines = parseBulkKeywordLines("áo polo\nÁo Polo\nbáo giá");
    const deduped = dedupeKeywords(lines);
    assert.equal(deduped.length, 2);
  });
});

describe("SEO scores", () => {
  it("clamps 0-100", () => {
    assert.equal(clampSeoScore(-5), 0);
    assert.equal(clampSeoScore(150), 100);
    assert.equal(clampSeoScore(72.4), 72);
  });

  it("normalizes primary keyword", () => {
    assert.equal(normalizePrimaryKeyword(" Báo Giá Áo Thun "), "báo giá áo thun");
  });
});

describe("SEO intent guidance", () => {
  it("suggests blog for informational", () => {
    const types = suggestContentTypeFromIntent("INFORMATIONAL");
    assert.ok(types.includes("BLOG_ARTICLE"));
  });

  it("does not auto-apply — returns array only", () => {
    assert.ok(Array.isArray(suggestContentTypeFromIntent("COMMERCIAL")));
  });
});

describe("SEO status transitions", () => {
  it("allows IDEA → RESEARCHING", () => {
    assert.equal(canTransitionTopic("IDEA", "RESEARCHING"), true);
  });

  it("blocks PUBLISHED → IDEA", () => {
    assert.equal(canTransitionTopic("PUBLISHED", "IDEA"), false);
  });

  it("allows strategy DRAFT → ACTIVE", () => {
    assert.equal(canTransitionStrategy("DRAFT", "ACTIVE"), true);
  });
});

describe("SEO media mapping", () => {
  it("maps BLOG_ARTICLE to BLOG_ARTICLE bundle type", () => {
    assert.equal(mapSeoContentTypeToBundleType("BLOG_ARTICLE"), "BLOG_ARTICLE");
  });

  it("maps COMPARISON to BLOG_ARTICLE", () => {
    assert.equal(mapSeoContentTypeToBundleType("COMPARISON"), "BLOG_ARTICLE");
  });

  it("maps CAPABILITY_PAGE to LANDING_PAGE", () => {
    assert.equal(mapSeoContentTypeToBundleType("CAPABILITY_PAGE"), "LANDING_PAGE");
  });
});

describe("SEO data integrity", () => {
  it("no fabricated metrics in keyword normalize (no volume inference)", () => {
    const kw = normalizeSeoKeyword("áo polo");
    assert.equal(typeof kw, "string");
    assert.ok(!kw.includes("volume"));
  });
});
