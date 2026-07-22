import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  classifyImageUrlDeterministic,
  scanProductImageHealth,
} from "@/features/products/product-image-health";

describe("classifyImageUrlDeterministic", () => {
  it("returns MISSING for empty URLs", () => {
    assert.equal(classifyImageUrlDeterministic("").status, "MISSING");
    assert.equal(classifyImageUrlDeterministic("   ").status, "MISSING");
  });

  it("flags admin/api URLs", () => {
    assert.equal(classifyImageUrlDeterministic("/api/media/abc").status, "ADMIN_API_URL");
    assert.equal(classifyImageUrlDeterministic("/admin/media/abc").status, "ADMIN_API_URL");
  });

  it("flags stale blob URLs", () => {
    assert.equal(
      classifyImageUrlDeterministic(
        "https://0iitstjrwqim8udr.public.blob.vercel-storage.com/products/demo.png",
      ).status,
      "STALE_BLOB",
    );
  });

  it("flags invalid protocols", () => {
    assert.equal(classifyImageUrlDeterministic("blob:https://example.com/a").status, "INVALID_URL");
    assert.equal(classifyImageUrlDeterministic("javascript:alert(1)").status, "INVALID_URL");
  });

  it("accepts canonical https URL as unknown-unchecked", () => {
    assert.equal(
      classifyImageUrlDeterministic("https://res.cloudinary.com/demo/image/upload/v1/a.jpg").status,
      "UNKNOWN_UNCHECKED",
    );
  });
});

describe("scanProductImageHealth", () => {
  it("returns per-field findings and promotes canonical to OK without remote checks", async () => {
    const findings = await scanProductImageHealth(
      {
        productId: "p1",
        productName: "Áo thun",
        slug: "ao-thun",
        featuredImage: "https://res.cloudinary.com/demo/image/upload/v1/a.jpg",
        gallery: ["/api/media/x", "https://0iitstjrwqim8udr.public.blob.vercel-storage.com/a.png"],
        images: [{ imageUrl: "" }],
        variants: [{ imageUrl: "https://res.cloudinary.com/demo/image/upload/v1/b.jpg" }],
        optionValues: [{ imageUrl: "javascript:alert(1)" }],
      },
      { checkRemote: false },
    );
    const byPath = new Map(findings.map((row) => [row.fieldPath, row.status]));
    assert.equal(byPath.get("featuredImage"), "OK");
    assert.equal(byPath.get("gallery[0]"), "ADMIN_API_URL");
    assert.equal(byPath.get("gallery[1]"), "STALE_BLOB");
    assert.equal(byPath.get("images[0].imageUrl"), "MISSING");
    assert.equal(byPath.get("variants[0].imageUrl"), "OK");
    assert.equal(byPath.get("optionValues[0].imageUrl"), "INVALID_URL");
  });
});
