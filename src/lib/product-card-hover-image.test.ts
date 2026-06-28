import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getProductCardHoverImageFromProduct,
  getProductCardHoverImageUrl,
} from "@/lib/productImages";

const PRIMARY = "https://cdn.example.com/products/front.jpg";
const SECONDARY = "https://cdn.example.com/products/back.jpg";

describe("product-card-hover-image", () => {
  it("returns the second distinct valid image after the primary", () => {
    const images = [
      { imageUrl: PRIMARY, sortOrder: 0 },
      { imageUrl: SECONDARY, sortOrder: 1 },
    ];
    assert.equal(getProductCardHoverImageUrl(images, PRIMARY), SECONDARY);
    assert.equal(
      getProductCardHoverImageFromProduct({ images, featuredImage: null, gallery: [] }),
      SECONDARY,
    );
  });

  it("returns null when no second image exists", () => {
    const images = [{ imageUrl: PRIMARY, sortOrder: 0 }];
    assert.equal(getProductCardHoverImageUrl(images, PRIMARY), null);
    assert.equal(
      getProductCardHoverImageFromProduct({ images, featuredImage: null, gallery: [] }),
      null,
    );
  });

  it("skips duplicate primary and secondary URLs", () => {
    const images = [
      { imageUrl: PRIMARY, sortOrder: 0 },
      { imageUrl: PRIMARY, sortOrder: 1 },
      { imageUrl: SECONDARY, sortOrder: 2 },
    ];
    assert.equal(getProductCardHoverImageUrl(images, PRIMARY), SECONDARY);
  });
});
