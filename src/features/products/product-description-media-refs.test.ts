import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  descriptionBlocksReferenceMediaAsset,
  extractImageUrlsFromDescriptionBlocks,
  extractMediaIdsFromDescriptionBlocks,
} from "@/features/products/product-description-blocks";

/**
 * Media deletion (`deleteMediaAsset`) and reference-count cards both rely on
 * resolveMediaReferences / countMediaReferencesBatch, which call these helpers
 * for Product.descriptionBlocks.
 */
describe("description block media reference extraction", () => {
  it("dedupes media ids used by cleanup protection", () => {
    const blocks = [
      {
        id: "i1",
        type: "image",
        mediaId: "asset-1",
        imageUrl: "https://cdn.example.com/a.jpg",
        alt: "A",
        layout: "content",
      },
      {
        id: "g1",
        type: "imageGrid",
        items: [
          {
            mediaId: "asset-1",
            imageUrl: "https://cdn.example.com/a.jpg",
            alt: "A",
          },
          {
            mediaId: "asset-2",
            imageUrl: "https://cdn.example.com/b.jpg",
            alt: "B",
          },
        ],
      },
    ];
    assert.deepEqual(extractMediaIdsFromDescriptionBlocks(blocks).sort(), [
      "asset-1",
      "asset-2",
    ]);
    assert.deepEqual(extractImageUrlsFromDescriptionBlocks(blocks).sort(), [
      "https://cdn.example.com/a.jpg",
      "https://cdn.example.com/b.jpg",
    ]);
  });

  it("marks asset in use via mediaId even when URL snapshot differs", () => {
    const blocks = [
      {
        id: "i1",
        type: "image",
        mediaId: "asset-live",
        imageUrl: "https://cdn.example.com/old-snapshot.jpg",
        alt: "Live",
        layout: "content",
      },
    ];
    assert.equal(descriptionBlocksReferenceMediaAsset(blocks, "asset-live"), true);
    assert.equal(
      descriptionBlocksReferenceMediaAsset(blocks, "other", [
        "https://cdn.example.com/old-snapshot.jpg",
      ]),
      true,
    );
  });

  it("tolerates malformed JSON without throwing", () => {
    assert.deepEqual(
      extractMediaIdsFromDescriptionBlocks([
        { type: "image", mediaId: "keep-me" },
        { type: "unknown", mediaId: "also" },
        null,
      ]),
      ["keep-me", "also"],
    );
  });
});
