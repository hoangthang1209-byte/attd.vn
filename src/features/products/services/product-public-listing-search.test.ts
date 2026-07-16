import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildPublicProductListingSearchOr,
  buildPublicProductListingWhere,
} from "./product.service";

describe("public product listing search", () => {
  it("1 search by product name is included in OR clauses", () => {
    const or = buildPublicProductListingSearchOr("Áo thun test");
    assert.ok(or.some((clause) => "name" in clause));
    assert.deepEqual(or.find((clause) => "name" in clause), {
      name: { contains: "Áo thun test", mode: "insensitive" },
    });
  });

  it("2 search by product code is included in OR clauses", () => {
    const or = buildPublicProductListingSearchOr("TSHI0001");
    assert.ok(or.some((clause) => "productCode" in clause));
    assert.deepEqual(or.find((clause) => "productCode" in clause), {
      productCode: { contains: "TSHI0001", mode: "insensitive" },
    });
  });

  it("3 search by slug ao-thun-test is included in OR clauses", () => {
    const or = buildPublicProductListingSearchOr("ao-thun-test");
    assert.ok(or.some((clause) => "slug" in clause));
    assert.deepEqual(or.find((clause) => "slug" in clause), {
      slug: { contains: "ao-thun-test", mode: "insensitive" },
    });

    const where = buildPublicProductListingWhere({ search: "ao-thun-test" });
    assert.equal(where.status, "ACTIVE");
    assert.ok(Array.isArray(where.OR));
    assert.ok(
      (where.OR as Array<Record<string, unknown>>).some(
        (clause) =>
          clause.slug &&
          typeof clause.slug === "object" &&
          (clause.slug as { contains?: string }).contains === "ao-thun-test",
      ),
    );
  });

  it("4 category filter + search still works together", () => {
    const where = buildPublicProductListingWhere({
      categoryIds: ["cat-1", "cat-2"],
      search: "ao-thun-test",
    });
    assert.deepEqual(where.categoryId, { in: ["cat-1", "cat-2"] });
    assert.ok(Array.isArray(where.OR));
    assert.equal((where.OR as unknown[]).length, 4);
    assert.ok(
      (where.OR as Array<Record<string, unknown>>).some((clause) => "slug" in clause),
    );
    assert.ok(
      (where.OR as Array<Record<string, unknown>>).some((clause) => "name" in clause),
    );
    assert.ok(
      (where.OR as Array<Record<string, unknown>>).some((clause) => "productCode" in clause),
    );
  });

  it("trims search and ignores blank queries", () => {
    assert.deepEqual(buildPublicProductListingSearchOr("   "), []);
    assert.deepEqual(buildPublicProductListingWhere({ search: "  " }).OR, undefined);
    const or = buildPublicProductListingSearchOr("  ao-thun-test  ");
    assert.deepEqual(or.find((clause) => "slug" in clause), {
      slug: { contains: "ao-thun-test", mode: "insensitive" },
    });
  });
});
