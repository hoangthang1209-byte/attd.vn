import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCatalogUrl,
  buildClearFiltersUrl,
  countActiveCatalogFilters,
  hasActiveCatalogFilters,
  removeCatalogFilterParam,
} from "./catalog-filter-url";

describe("catalog-filter-url", () => {
  it("buildCatalogUrl encodes filters, sort, and pagination", () => {
    assert.equal(
      buildCatalogUrl(
        {
          category: "ao-thun-tron",
          q: "polo",
          inStock: true,
          print: true,
          sort: "name",
        },
        { page: 2 },
      ),
      "/san-pham?category=ao-thun-tron&q=polo&inStock=1&print=1&sort=name&page=2",
    );
  });

  it("buildCatalogUrl omits default newest sort and page 1", () => {
    assert.equal(
      buildCatalogUrl({ category: "non-luoi-trai", sort: "newest" }, { page: 1 }),
      "/san-pham?category=non-luoi-trai",
    );
  });

  it("removeCatalogFilterParam preserves other filters including sort", () => {
    const filters = {
      category: "ao-thun-tron",
      q: "polo",
      inStock: true,
      sort: "name" as const,
    };

    assert.equal(
      removeCatalogFilterParam(filters, "category"),
      "/san-pham?q=polo&inStock=1&sort=name",
    );
  });

  it("buildClearFiltersUrl preserves search query and non-default sort", () => {
    assert.equal(buildClearFiltersUrl("polo", "name"), "/san-pham?q=polo&sort=name");
    assert.equal(buildClearFiltersUrl("polo", "newest"), "/san-pham?q=polo");
  });

  it("countActiveCatalogFilters and hasActiveCatalogFilters ignore search/sort", () => {
    const filters = {
      category: "ao-thun-tron",
      q: "polo",
      inStock: true,
      sort: "name" as const,
    };

    assert.equal(countActiveCatalogFilters(filters), 2);
    assert.equal(hasActiveCatalogFilters(filters), true);
    assert.equal(hasActiveCatalogFilters({ q: "polo", sort: "name" }), false);
  });

  it("pagination preserves full catalog state", () => {
    const filters = {
      category: "ao-thun-tron",
      q: "polo",
      embroidery: true,
      sort: "name" as const,
    };

    assert.equal(
      buildCatalogUrl(filters, { page: 3 }),
      "/san-pham?category=ao-thun-tron&q=polo&embroidery=1&sort=name&page=3",
    );
    assert.equal(
      buildCatalogUrl(filters, { page: 1 }),
      "/san-pham?category=ao-thun-tron&q=polo&embroidery=1&sort=name",
    );
  });
});
