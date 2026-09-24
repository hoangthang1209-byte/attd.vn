import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCatalogQuickNavCategories,
  buildCategoryPageNavContext,
} from "./catalog-category-nav.utils";
import type { CmsCategoryTreeNode } from "./services/category.service";

const tree: CmsCategoryTreeNode[] = [
  {
    id: "p1",
    slug: "ao-thun",
    name: "Áo thun",
    skuCode: null,
    imageUrl: null,
    mediaAssetId: null,
    productCount: 10,
    featuredImage: null,
    isActive: true,
    sortOrder: 0,
    children: [
      {
        id: "c1",
        slug: "ao-thun-tron",
        name: "Áo thun trơn",
        skuCode: null,
        imageUrl: null,
        mediaAssetId: null,
        productCount: 6,
        featuredImage: null,
        isActive: true,
        sortOrder: 0,
      },
      {
        id: "c2",
        slug: "ao-thun-cvc",
        name: "Áo thun CVC",
        skuCode: null,
        imageUrl: null,
        mediaAssetId: null,
        productCount: 0,
        featuredImage: null,
        isActive: true,
        sortOrder: 1,
      },
    ],
  },
  {
    id: "p2",
    slug: "non",
    name: "Nón",
    skuCode: null,
    imageUrl: null,
    mediaAssetId: null,
    productCount: 4,
    featuredImage: null,
    isActive: true,
    sortOrder: 1,
    children: [
      {
        id: "c3",
        slug: "non-luoi-trai",
        name: "Nón lưỡi trai",
        skuCode: null,
        imageUrl: null,
        mediaAssetId: null,
        productCount: 4,
        featuredImage: null,
        isActive: true,
        sortOrder: 0,
      },
    ],
  },
];

describe("catalog-category-nav.utils", () => {
  it("buildCatalogQuickNavCategories returns visible child categories", () => {
    const items = buildCatalogQuickNavCategories(tree);
    assert.deepEqual(
      items.map((item) => item.slug),
      ["ao-thun-tron", "non-luoi-trai"],
    );
    assert.equal(items[0]?.href, "/san-pham?category=ao-thun-tron");
  });

  it("buildCatalogQuickNavCategories scopes to active parent section", () => {
    const items = buildCatalogQuickNavCategories(tree, "ao-thun-tron");
    assert.deepEqual(items.map((item) => item.slug), ["ao-thun-tron"]);
  });

  it("buildCatalogQuickNavCategories preserves base catalog filters in chip hrefs", () => {
    const baseFilters = {
      q: "polo",
      inStock: true,
      sort: "name" as const,
    };
    const items = buildCatalogQuickNavCategories(tree, "ao-thun-tron", baseFilters);
    assert.equal(
      items[0]?.href,
      "/san-pham?category=ao-thun-tron&q=polo&inStock=1&sort=name",
    );
  });

  it("buildCategoryPageNavContext returns child and related categories", () => {
    const parentContext = buildCategoryPageNavContext(tree, "ao-thun");
    assert.equal(parentContext.parent, null);
    assert.deepEqual(
      parentContext.children.map((item) => item.slug),
      ["ao-thun-tron"],
    );

    const childContext = buildCategoryPageNavContext(tree, "ao-thun-tron");
    assert.equal(childContext.parent?.slug, "ao-thun");
    assert.deepEqual(childContext.related, []);
  });
});
