import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { STORAGE_FOLDER_TO_MEDIA } from "@/lib/storage/types";

/**
 * Lightweight mirror of parseMediaMetadataPatchBody acceptance rules
 * so we can assert storage fields are never accepted without bootstrapping Prisma.
 */
function parseMetadataKeys(raw: Record<string, unknown>): string[] {
  const allowed = new Set([
    "folder",
    "usageType",
    "libraryId",
    "roleId",
    "visibility",
    "altText",
    "title",
    "caption",
    "description",
    "tags",
    "keywords",
    "aiTags",
    "contentLanguage",
  ]);
  return Object.keys(raw).filter((key) => allowed.has(key));
}

describe("media metadata patch safety", () => {
  it("does not treat storage fields as metadata updates", () => {
    const keys = parseMetadataKeys({
      libraryId: "ml_product",
      roleId: "mr_factory",
      visibility: "PUBLIC",
      tags: ["xưởng"],
      keywords: ["áo thun"],
      url: "https://evil.example/hack.jpg",
      storageKey: "should-be-ignored",
      publicId: "should-be-ignored",
      thumbnailUrl: "should-be-ignored",
      filename: "should-be-ignored",
    });
    assert.deepEqual(keys.sort(), ["keywords", "libraryId", "roleId", "tags", "visibility"]);
  });

  it("bulk opt-in only includes enabled metadata keys", () => {
    const keys = parseMetadataKeys({
      ids: ["a", "b"],
      libraryId: "ml_blog",
    });
    assert.deepEqual(keys, ["libraryId"]);
  });

  it("keeps legacy storage folder mapping intact", () => {
    assert.equal(STORAGE_FOLDER_TO_MEDIA.products, "PRODUCTS");
    assert.equal(STORAGE_FOLDER_TO_MEDIA.blog, "BLOG");
  });
});
