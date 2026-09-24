import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { catalogSortOrderBy, parseCatalogSort } from "./catalog-sort";

describe("catalog-sort", () => {
  it("parseCatalogSort accepts only whitelisted values", () => {
    assert.equal(parseCatalogSort("name"), "name");
    assert.equal(parseCatalogSort("newest"), "newest");
    assert.equal(parseCatalogSort("price"), "newest");
    assert.equal(parseCatalogSort(undefined), "newest");
  });

  it("catalogSortOrderBy maps sort options to Prisma orderBy", () => {
    assert.deepEqual(catalogSortOrderBy("name"), { name: "asc" });
    assert.deepEqual(catalogSortOrderBy("newest"), { createdAt: "desc" });
  });
});
