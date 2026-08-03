import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { extractInlineMediaIdsFromHtml } from "@/features/content/inline-media/inline-media-figure";
import { rewriteBlogHtmlMediaId } from "@/features/media/lifecycle/media-replacement.service";
import { recommendAssetNextAction } from "@/features/media/lifecycle/next-action.service";

describe("Sprint 14.6 Blog HTML data-media-id hardening", () => {
  it("extracts data-media-id from figure markup", () => {
    const html = `<figure class="article-figure" data-media-id="cms_polo_1" data-inline-variant="CONTENT_WIDTH">
  <img src="https://example.com/a.jpg" alt="Polo" />
</figure>`;
    assert.deepEqual(extractInlineMediaIdsFromHtml(html), ["cms_polo_1"]);
  });

  it("rewrites data-media-id and src without touching other figures", () => {
    const html = `<figure data-media-id="old1"><img src="https://cdn/old.jpg" alt="a" /></figure>
<figure data-media-id="keep"><img src="https://cdn/keep.jpg" alt="b" /></figure>`;
    const next = rewriteBlogHtmlMediaId(html, "old1", "new1", "https://cdn/new.jpg");
    assert.match(next, /data-media-id="new1"/);
    assert.match(next, /https:\/\/cdn\/new\.jpg/);
    assert.match(next, /data-media-id="keep"/);
    assert.match(next, /https:\/\/cdn\/keep\.jpg/);
    assert.doesNotMatch(next, /data-media-id="old1"/);
  });

  it("is idempotent when ids already replaced", () => {
    const html = `<figure data-media-id="new1"><img src="https://cdn/new.jpg" alt="a" /></figure>`;
    const next = rewriteBlogHtmlMediaId(html, "old1", "new1", "https://cdn/new.jpg");
    assert.equal(next, html);
  });

  it("handles invalid/empty html safely", () => {
    assert.equal(rewriteBlogHtmlMediaId("", "a", "b", "https://x"), "");
    assert.deepEqual(extractInlineMediaIdsFromHtml("<p>no figure</p>"), []);
  });
});

describe("Sprint 14.6 next action", () => {
  it("prioritizes missing alt", () => {
    const action = recommendAssetNextAction({
      altText: null,
      title: "Polo",
      lifecycleStatus: "ACTIVE",
      visibility: "PUBLIC",
      rightsStatus: "OWNED",
      publicReferenceCount: 1,
      totalReferenceCount: 1,
      bundleCount: 1,
      seoScore: 80,
    });
    assert.equal(action.code, "ADD_ALT");
  });

  it("asks to replace public usages when deprecated", () => {
    const action = recommendAssetNextAction({
      altText: "ok",
      title: "Polo",
      lifecycleStatus: "DEPRECATED",
      visibility: "PUBLIC",
      rightsStatus: "OWNED",
      publicReferenceCount: 2,
      totalReferenceCount: 2,
      bundleCount: 0,
      seoScore: 80,
    });
    assert.equal(action.code, "REPLACE_PUBLIC");
  });
});
