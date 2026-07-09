import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getPatternCategoryInitials,
  normalizePatternCategoryVisual,
  resolvePatternCategoryImageUrl,
} from "./pattern-category-visual";

describe("pattern-category-visual", () => {
  it("prefers category imageUrl over product featuredImage", () => {
    assert.equal(
      resolvePatternCategoryImageUrl({
        imageUrl: "/uploads/categories/polo.jpg",
        featuredImage: "/uploads/products/other.jpg",
      }),
      "/uploads/categories/polo.jpg",
    );
  });

  it("falls back to featuredImage when imageUrl is missing", () => {
    assert.equal(
      resolvePatternCategoryImageUrl({
        imageUrl: null,
        featuredImage: "/uploads/products/shirt.jpg",
      }),
      "/uploads/products/shirt.jpg",
    );
  });

  it("normalizes nested product featuredImage", () => {
    assert.deepEqual(
      normalizePatternCategoryVisual({
        name: "Áo Polo",
        imageUrl: null,
        products: [{ featuredImage: "/uploads/products/polo.jpg" }],
      }),
      {
        name: "Áo Polo",
        imageUrl: null,
        featuredImage: "/uploads/products/polo.jpg",
      },
    );
  });

  it("builds initials from category name", () => {
    assert.equal(getPatternCategoryInitials("Áo Polo"), "ÁP");
    assert.equal(getPatternCategoryInitials("Thun"), "TH");
  });
});
