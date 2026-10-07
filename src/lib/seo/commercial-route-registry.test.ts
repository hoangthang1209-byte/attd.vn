import assert from "node:assert/strict";
import { test } from "node:test";
import { INDEXABLE_STATIC_COMMERCIAL_PATHS, isReservedStaticPublicSlug } from "./indexable-category-routes";

test("all five business solutions are discoverable through the static sitemap registry", () => {
  for (const path of ["/dong-phuc-doanh-nghiep", "/nguon-hang", "/oem", "/qua-tang-doanh-nghiep", "/merchandise"]) {
    assert.ok((INDEXABLE_STATIC_COMMERCIAL_PATHS as readonly string[]).includes(path), path);
    assert.equal(isReservedStaticPublicSlug(path.slice(1)), true, path);
  }
});

test("static sitemap paths are unique", () => {
  assert.equal(new Set(INDEXABLE_STATIC_COMMERCIAL_PATHS).size, INDEXABLE_STATIC_COMMERCIAL_PATHS.length);
});
