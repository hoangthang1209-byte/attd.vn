import assert from "node:assert/strict";
import { test } from "node:test";
import { CATEGORY_LANDING_PRODUCT_LIMIT, loadCategoryLandingProducts } from "./category-landing-products";

test("parent landing includes direct and descendant products using catalog scope", async () => {
  const fixture = [
    { id: "direct", categoryId: "parent", status: "ACTIVE", slug: "direct", active: true, metadata: {} },
    { id: "child", categoryId: "child", status: "ACTIVE", slug: "child", active: true, metadata: {} },
    { id: "draft", categoryId: "child", status: "DRAFT", slug: "draft", active: true, metadata: {} },
    { id: "hidden", categoryId: "child", status: "ACTIVE", slug: "hidden", active: false, metadata: {} },
    { id: "other", categoryId: "other", status: "ACTIVE", slug: "other", active: true, metadata: {} },
    { id: "demo", categoryId: "child", status: "ACTIVE", slug: "demo", active: true, metadata: { isDemo: true } },
  ];
  let calls = 0;
  const result = await loadCategoryLandingProducts(["parent", "child"], async (query) => {
    calls++;
    assert.deepEqual(query.where, {
      status: "ACTIVE", slug: { not: "" }, category: { isActive: true }, categoryId: { in: ["parent", "child"] },
    });
    assert.equal(query.take, CATEGORY_LANDING_PRODUCT_LIMIT + 1);
    return fixture.filter(p => ["parent", "child"].includes(p.categoryId) && p.status === "ACTIVE" && p.slug && p.active);
  });
  assert.equal(calls, 1);
  assert.deepEqual(result.products.map(p => p.id), ["direct", "child"]);
  assert.equal(result.hasMoreProducts, false);
});

test("category preview caps cards and signals the catalog continuation", async () => {
  const result = await loadCategoryLandingProducts(["parent"], async () =>
    Array.from({ length: 25 }, (_, id) => ({ id, metadata: {} })),
  );
  assert.equal(result.products.length, 24);
  assert.equal(result.hasMoreProducts, true);
});

test("inaccessible category scope cannot load an unrestricted product list", async () => {
  const result = await loadCategoryLandingProducts([], async () => { throw new Error("Must not query"); });
  assert.deepEqual(result, { products: [], hasMoreProducts: false });
});
