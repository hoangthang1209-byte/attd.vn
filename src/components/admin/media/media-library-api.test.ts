import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildMediaLibraryApiUrl,
  mergeMediaLibraryPages,
  parseMediaLibraryResponse,
  MEDIA_LIBRARY_PAGE_SIZE,
} from "@/components/admin/media/media-library-api";

describe("media library API helpers", () => {
  it("requests paginated full-library results by default", () => {
    const url = buildMediaLibraryApiUrl({ search: "polo" });
    assert.match(url, /paginated=1/);
    assert.match(url, /search=polo/);
    assert.doesNotMatch(url, /folder=/);
  });

  it("continues the same full-library query with cursor", () => {
    const url = buildMediaLibraryApiUrl({
      cursor: "asset-100",
      paginated: true,
    });
    assert.match(url, /paginated=1/);
    assert.match(url, /cursor=asset-100/);
    assert.doesNotMatch(url, /folder=/);
  });

  it("parses pagination metadata from paginated API responses", () => {
    const parsed = parseMediaLibraryResponse({
      items: [{ id: "a1", url: "https://cdn.test/a1.jpg" }],
      nextCursor: "a1",
      hasMore: true,
      total: 250,
    });

    assert.equal(parsed.items.length, 1);
    assert.equal(parsed.nextCursor, "a1");
    assert.equal(parsed.hasMore, true);
    assert.equal(parsed.total, 250);
  });

  it("does not treat a single legacy page as the full library when more pages exist", () => {
    const firstPage = parseMediaLibraryResponse({
      items: Array.from({ length: MEDIA_LIBRARY_PAGE_SIZE }, (_, index) => ({
        id: `asset-${index}`,
      })),
      nextCursor: `asset-${MEDIA_LIBRARY_PAGE_SIZE - 1}`,
      hasMore: true,
      total: MEDIA_LIBRARY_PAGE_SIZE + 25,
    });

    assert.equal(firstPage.hasMore, true);
    assert.ok(firstPage.nextCursor);
    assert.equal(firstPage.total, MEDIA_LIBRARY_PAGE_SIZE + 25);

    const secondPage = parseMediaLibraryResponse({
      items: [{ id: "asset-next", url: "https://cdn.test/next.jpg" }],
      nextCursor: null,
      hasMore: false,
      total: MEDIA_LIBRARY_PAGE_SIZE + 25,
    });

    const merged = mergeMediaLibraryPages(firstPage.items, secondPage.items);
    assert.equal(merged.length, MEDIA_LIBRARY_PAGE_SIZE + 1);
  });
});
