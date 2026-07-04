import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mapManufacturingAssetToFrontend } from "@/lib/manufacturing/manufacturing.mapper";

const baseAsset = {
  id: "asset-1",
  title: "QC Evidence",
  slug: "qc-evidence",
  description: "Quality check",
  status: "PUBLISHED" as const,
  visibility: "PUBLIC" as const,
  priority: 10,
  featured: true,
  publishedAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-02T00:00:00.000Z"),
  category: { slug: "qc", name: "QC" },
  tags: [{ tag: { name: "QC", slug: "qc" } }],
};

describe("manufacturing mapper", () => {
  it("uses media role priority for frontend image selection", () => {
    const mapped = mapManufacturingAssetToFrontend({
      ...baseAsset,
      media: [
        {
          role: "GALLERY",
          altText: null,
          sortOrder: 0,
          mediaAsset: {
            url: "https://cdn.test/gallery.jpg",
            mimeType: "image/jpeg",
            altText: "Gallery",
            title: null,
          },
        },
        {
          role: "THUMBNAIL",
          altText: "Thumb",
          sortOrder: 10,
          mediaAsset: {
            url: "https://cdn.test/thumb.jpg",
            mimeType: "image/jpeg",
            altText: null,
            title: null,
          },
        },
      ],
    });

    assert.equal(mapped.imageUrl, "https://cdn.test/thumb.jpg");
    assert.equal(mapped.alt, "Thumb");
    assert.equal(mapped.categoryName, "QC");
  });

  it("drops invalid media URLs from frontend output", () => {
    const mapped = mapManufacturingAssetToFrontend({
      ...baseAsset,
      media: [
        {
          role: "THUMBNAIL",
          altText: null,
          sortOrder: 0,
          mediaAsset: {
            url: "#",
            mimeType: "image/jpeg",
            altText: null,
            title: null,
          },
        },
      ],
    });

    assert.equal(mapped.imageUrl, undefined);
    assert.equal(mapped.videoUrl, undefined);
  });
});
