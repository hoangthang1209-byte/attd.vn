import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ROBOTS_INDEX_FOLLOW,
  ROBOTS_NOINDEX_FOLLOW,
  buildBlogCategoryMetadata,
  buildBlogIndexMetadata,
  buildCatalogMetadata,
} from "./indexation-policy";

function canonicalOf(meta: unknown): string {
  const alternates = (meta as { alternates?: { canonical?: string | URL } }).alternates;
  const value = alternates?.canonical;
  if (!value) return "";
  return typeof value === "string" ? value : value.toString();
}

function robotsOf(meta: unknown): { index: boolean; follow: boolean } {
  const robots = (meta as { robots?: { index?: boolean; follow?: boolean } }).robots;
  return {
    index: robots?.index ?? true,
    follow: robots?.follow ?? true,
  };
}

describe("buildCatalogMetadata", () => {
  it("indexes clean /san-pham", () => {
    const meta = buildCatalogMetadata({});
    assert.equal(canonicalOf(meta), "https://www.attd.vn/san-pham");
    assert.deepEqual(robotsOf(meta), { index: true, follow: true });
  });

  it("noindexes category-only filter to approved landing canonical", () => {
    const meta = buildCatalogMetadata({ category: "ao-thun-tron" });
    assert.equal(canonicalOf(meta), "https://www.attd.vn/ao-thun-tron");
    assert.deepEqual(robotsOf(meta), ROBOTS_NOINDEX_FOLLOW);
  });

  it("noindexes category + page with self canonical", () => {
    const meta = buildCatalogMetadata({ category: "ao-thun-tron", page: "2" });
    assert.equal(canonicalOf(meta), "https://www.attd.vn/san-pham?category=ao-thun-tron&page=2");
    assert.deepEqual(robotsOf(meta), ROBOTS_NOINDEX_FOLLOW);
  });

  it("noindexes category + search with self canonical", () => {
    const meta = buildCatalogMetadata({ category: "ao-thun-tron", q: "ao" });
    assert.equal(canonicalOf(meta), "https://www.attd.vn/san-pham?category=ao-thun-tron&q=ao");
    assert.deepEqual(robotsOf(meta), ROBOTS_NOINDEX_FOLLOW);
  });

  it("noindexes unknown substantive params with self canonical", () => {
    const meta = buildCatalogMetadata({ availability: "ready" });
    assert.equal(canonicalOf(meta), "https://www.attd.vn/san-pham?availability=ready");
    assert.deepEqual(robotsOf(meta), ROBOTS_NOINDEX_FOLLOW);
  });

  it("noindexes tracking-only URLs to clean /san-pham", () => {
    const meta = buildCatalogMetadata({ utm_source: "facebook" });
    assert.equal(canonicalOf(meta), "https://www.attd.vn/san-pham");
    assert.deepEqual(robotsOf(meta), ROBOTS_NOINDEX_FOLLOW);
  });

  it("noindexes category + tracking-only to approved landing canonical", () => {
    const meta = buildCatalogMetadata({ category: "ao-thun-tron", utm_source: "facebook" });
    assert.equal(canonicalOf(meta), "https://www.attd.vn/ao-thun-tron");
    assert.deepEqual(robotsOf(meta), ROBOTS_NOINDEX_FOLLOW);
  });

  it("ignores empty substantive params", () => {
    const meta = buildCatalogMetadata({ q: "", page: "" });
    assert.equal(canonicalOf(meta), "https://www.attd.vn/san-pham");
    assert.deepEqual(robotsOf(meta), ROBOTS_INDEX_FOLLOW);
  });
});

describe("buildBlogIndexMetadata", () => {
  it("indexes clean /blog", () => {
    const meta = buildBlogIndexMetadata({});
    assert.equal(canonicalOf(meta), "https://www.attd.vn/blog");
    assert.deepEqual(robotsOf(meta), ROBOTS_INDEX_FOLLOW);
  });

  it("noindexes paginated archive with self canonical", () => {
    const meta = buildBlogIndexMetadata({ page: "2" });
    assert.equal(canonicalOf(meta), "https://www.attd.vn/blog?page=2");
    assert.deepEqual(robotsOf(meta), ROBOTS_NOINDEX_FOLLOW);
  });

  it("noindexes unknown filters with self canonical", () => {
    const meta = buildBlogIndexMetadata({ unknownFilter: "x" });
    assert.equal(canonicalOf(meta), "https://www.attd.vn/blog?unknownFilter=x");
    assert.deepEqual(robotsOf(meta), ROBOTS_NOINDEX_FOLLOW);
  });
});

describe("buildBlogCategoryMetadata", () => {
  it("noindexes paginated category archive with self canonical", () => {
    const meta = buildBlogCategoryMetadata("huong-dan", { page: "2" });
    assert.equal(canonicalOf(meta), "https://www.attd.vn/blog/danh-muc/huong-dan?page=2");
    assert.deepEqual(robotsOf(meta), ROBOTS_NOINDEX_FOLLOW);
  });
});
