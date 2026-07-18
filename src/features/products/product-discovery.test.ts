import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  addRecentlyViewedProductSlug,
  dedupeProductRailSlugs,
  getRenderableRecentProductSlugs,
  mapProductToDiscoveryCard,
  normalizeRecentProductSlugs,
  normalizeProductSlug,
} from "./product-discovery";

describe("product-discovery", () => {
  it("normalizes safe product slugs only", () => {
    assert.equal(normalizeProductSlug(" ao-polo "), "ao-polo");
    assert.equal(normalizeProductSlug("áo-polo"), null);
    assert.equal(normalizeProductSlug("../admin"), null);
    assert.equal(normalizeProductSlug(""), null);
  });

  it("serializes recently viewed slugs newest-first and deduped", () => {
    const next = addRecentlyViewedProductSlug(["ao-thun", "non", "ao-thun"], "ao-polo", 4);
    assert.deepEqual(next, ["ao-polo", "ao-thun", "non"]);
  });

  it("excludes current product from rendered recently viewed products", () => {
    const renderable = getRenderableRecentProductSlugs(["ao-polo", "ao-thun", "non"], "ao-polo");
    assert.deepEqual(renderable, ["ao-thun", "non"]);
  });

  it("dedupes product rails and excludes prior rail slugs", () => {
    const products = [
      { slug: "ao-polo", id: "1" },
      { slug: "ao-thun", id: "2" },
      { slug: "ao-polo", id: "3" },
      { slug: "non", id: "4" },
    ];
    assert.deepEqual(dedupeProductRailSlugs(products, ["ao-thun"]), [
      { slug: "ao-polo", id: "1" },
      { slug: "non", id: "4" },
    ]);
  });

  it("caps recent history and rejects malformed values", () => {
    assert.deepEqual(
      normalizeRecentProductSlugs(["a", "b", "bad/slug", "a", 123, "c"], 2),
      ["a", "b"],
    );
  });

  it("maps raw products to a public-safe discovery card payload", () => {
    const card = mapProductToDiscoveryCard({
      id: "p1",
      slug: "ao-polo",
      name: "Áo polo",
      productCode: "POLO-001",
      defaultMoq: 50,
      leadTime: "7-10 ngày",
      supportsPrinting: true,
      supportsOem: true,
      metadata: {
        curatedSalesBadges: ["NEW"],
        internalNote: "do-not-leak",
      },
      category: { name: "Áo polo" },
      featuredImage: "/demo.jpg",
      images: [],
      variants: [],
    });

    assert.deepEqual(Object.keys(card).sort(), [
      "availableColors",
      "category",
      "hoverImageUrl",
      "id",
      "imageUrl",
      "leadTime",
      "moq",
      "name",
      "productCode",
      "salesBadges",
      "slug",
    ]);
    assert.equal("metadata" in card, false);
    assert.equal("internalNote" in card, false);
  });
});
