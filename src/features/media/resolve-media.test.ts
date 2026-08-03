import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCanonicalMediaWrite,
  resolveMedia,
  resolveLegacyMediaUrl,
} from "@/features/media/resolve-media";

describe("resolveMedia (Sprint 14.7)", () => {
  it("prefers MediaAsset over legacy URL", () => {
    const resolved = resolveMedia({
      mediaAsset: {
        id: "asset-1",
        url: "https://cdn.example.com/canonical.jpg",
        altText: "Canonical",
        visibility: "PUBLIC",
      },
      legacyUrl: "https://cdn.example.com/legacy.jpg",
    });
    assert.equal(resolved.source, "MEDIA_ASSET");
    assert.equal(resolved.src, "https://cdn.example.com/canonical.jpg");
    assert.equal(resolved.mediaAssetId, "asset-1");
    assert.equal(resolved.alt, "Canonical");
    assert.equal(resolved.broken, false);
  });

  it("falls back to legacy URL when asset missing", () => {
    const resolved = resolveMedia({
      legacyUrl: "https://cdn.example.com/legacy.jpg",
    });
    assert.equal(resolved.source, "LEGACY_URL");
    assert.equal(resolved.src, "https://cdn.example.com/legacy.jpg");
  });

  it("falls back to legacy when MediaAsset has no usable URL", () => {
    const resolved = resolveMedia({
      mediaAsset: { id: "a", url: null, visibility: "PUBLIC" },
      legacyUrl: "https://cdn.example.com/legacy.jpg",
    });
    assert.equal(resolved.source, "LEGACY_URL");
    assert.equal(resolved.src, "https://cdn.example.com/legacy.jpg");
  });

  it("returns NONE when empty", () => {
    const resolved = resolveMedia({});
    assert.equal(resolved.source, "NONE");
    assert.equal(resolved.src, null);
  });

  it("skips PRIVATE assets for public render and uses legacy", () => {
    const resolved = resolveMedia({
      mediaAsset: {
        id: "priv",
        url: "https://cdn.example.com/private.jpg",
        visibility: "PRIVATE",
      },
      legacyUrl: "https://cdn.example.com/public-mirror.jpg",
    });
    assert.equal(resolved.source, "LEGACY_URL");
    assert.equal(resolved.src, "https://cdn.example.com/public-mirror.jpg");
  });

  it("buildCanonicalMediaWrite stores id + URL mirror", () => {
    const write = buildCanonicalMediaWrite({
      mediaAssetId: " m1 ",
      url: "https://cdn.example.com/x.jpg",
      altText: " Alt ",
    });
    assert.equal(write.mediaAssetId, "m1");
    assert.equal(write.imageUrl, "https://cdn.example.com/x.jpg");
    assert.equal(write.altText, "Alt");
  });

  it("resolveLegacyMediaUrl wraps resolver", () => {
    assert.equal(
      resolveLegacyMediaUrl("https://cdn.example.com/p.jpg"),
      "https://cdn.example.com/p.jpg",
    );
    assert.equal(resolveLegacyMediaUrl(null), null);
  });
});
