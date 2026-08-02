import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isSingleAssetPlacement,
  mapBundleSlotToBlogPlacement,
  placementToLegacyBlogField,
  shouldClearLegacyUrl,
} from "./blog-bundle-slot-map";
import {
  BLOG_FEATURED_PRESET,
  BLOG_INLINE_PRESET,
  BLOG_OG_PRESET,
  blogDiscoveryPresetForPlacement,
} from "./blog-media-presets";
import {
  buildBlogInlineFigureHtml,
  evaluateBlogMediaReadiness,
} from "./blog-media-readiness";

describe("bundle slot → blog placement map", () => {
  it("maps FEATURED/COVER/OG/INLINE correctly", () => {
    assert.equal(mapBundleSlotToBlogPlacement("FEATURED"), "FEATURED");
    assert.equal(mapBundleSlotToBlogPlacement("COVER"), "COVER");
    assert.equal(mapBundleSlotToBlogPlacement("OG_IMAGE"), "OG_IMAGE");
    assert.equal(mapBundleSlotToBlogPlacement("INLINE"), "INLINE");
  });

  it("maps Process/Material/Technique/Factory/Product/Gallery to INLINE", () => {
    for (const slot of ["PROCESS", "MATERIAL", "TECHNIQUE", "FACTORY", "PRODUCT", "GALLERY"] as const) {
      assert.equal(mapBundleSlotToBlogPlacement(slot), "INLINE");
    }
  });

  it("marks Featured/OG/Cover as single-asset placements", () => {
    assert.equal(isSingleAssetPlacement("FEATURED"), true);
    assert.equal(isSingleAssetPlacement("OG_IMAGE"), true);
    assert.equal(isSingleAssetPlacement("COVER"), true);
    assert.equal(isSingleAssetPlacement("INLINE"), false);
  });
});

describe("legacy URL sync rules", () => {
  it("maps placements to legacy Blog fields", () => {
    assert.equal(placementToLegacyBlogField("FEATURED"), "featuredImageUrl");
    assert.equal(placementToLegacyBlogField("OG_IMAGE"), "ogImageUrl");
    assert.equal(placementToLegacyBlogField("INLINE"), null);
  });

  it("clears URL only when it still matches removed asset", () => {
    assert.equal(
      shouldClearLegacyUrl({
        currentUrl: "https://cdn.example/a.jpg",
        removedAssetUrl: "https://cdn.example/a.jpg",
      }),
      true,
    );
    assert.equal(
      shouldClearLegacyUrl({
        currentUrl: "https://cdn.example/manual.jpg",
        removedAssetUrl: "https://cdn.example/a.jpg",
      }),
      false,
    );
  });
});

describe("blog media readiness", () => {
  it("warns on missing OG", () => {
    const result = evaluateBlogMediaReadiness({
      status: "DRAFT",
      featuredImageUrl: "https://x/f.jpg",
      assignments: [],
    });
    assert.ok(result.warnings.some((w) => w.includes("OG")));
    assert.equal(result.ready, true);
  });

  it("errors on PRIVATE asset when publishing", () => {
    const result = evaluateBlogMediaReadiness({
      status: "PUBLISHED",
      featuredImageUrl: "https://x/f.jpg",
      assignments: [
        {
          placement: "FEATURED",
          mediaAsset: { visibility: "PRIVATE", seoScore: 80, altText: "ok" },
        },
      ],
    });
    assert.equal(result.ready, false);
    assert.ok(result.errors.some((e) => e.includes("PRIVATE") || e.includes("PUBLIC")));
    assert.ok(result.privateAssetCount >= 1);
  });

  it("warns on low SEO featured score", () => {
    const result = evaluateBlogMediaReadiness({
      status: "DRAFT",
      assignments: [
        {
          placement: "FEATURED",
          mediaAsset: { visibility: "PUBLIC", seoScore: 40, altText: "polo" },
        },
      ],
    });
    assert.ok(result.lowSeoAssetCount >= 1 || result.warnings.some((w) => w.includes("SEO")));
  });

  it("ready when featured + og present and public", () => {
    const result = evaluateBlogMediaReadiness({
      status: "PUBLISHED",
      assignments: [
        {
          placement: "FEATURED",
          mediaAsset: { visibility: "PUBLIC", seoScore: 80, altText: "a" },
        },
        {
          placement: "OG_IMAGE",
          mediaAsset: { visibility: "PUBLIC", seoScore: 75, altText: "b" },
        },
        {
          placement: "INLINE",
          mediaAsset: { visibility: "PUBLIC", seoScore: 70, altText: "c" },
        },
        {
          placement: "INLINE",
          mediaAsset: { visibility: "PUBLIC", seoScore: 72, altText: "d" },
        },
      ],
      contentLength: 2000,
    });
    assert.equal(result.ready, true);
    assert.equal(result.featuredAssigned, true);
    assert.equal(result.ogAssigned, true);
    assert.ok(result.inlineCount >= 2);
  });
});

describe("inline figure HTML", () => {
  it("embeds mediaAssetId and does not use base64", () => {
    const html = buildBlogInlineFigureHtml({
      mediaAssetId: "asset_1",
      url: "https://cdn.example/p.jpg",
      altText: 'áo polo "công ty"',
      caption: "Quy trình may",
    });
    assert.match(html, /data-media-id="asset_1"/);
    assert.match(html, /src="https:\/\/cdn\.example\/p\.jpg"/);
    assert.doesNotMatch(html, /data:image/);
    assert.match(html, /figcaption/);
  });
});

describe("blog discovery presets", () => {
  it("featured prefers landscape public and FEATURED_IMAGE", () => {
    assert.ok(BLOG_FEATURED_PRESET.contentSuitabilities.includes("FEATURED_IMAGE"));
    assert.equal(BLOG_FEATURED_PRESET.orientation, "LANDSCAPE");
    assert.equal(BLOG_FEATURED_PRESET.visibility, "PUBLIC");
  });

  it("og and inline presets differ", () => {
    assert.ok(BLOG_OG_PRESET.contentSuitabilities.includes("OG_IMAGE"));
    assert.ok(BLOG_INLINE_PRESET.contentSuitabilities.includes("BLOG_INLINE"));
    assert.equal(blogDiscoveryPresetForPlacement("INLINE"), BLOG_INLINE_PRESET);
  });
});
