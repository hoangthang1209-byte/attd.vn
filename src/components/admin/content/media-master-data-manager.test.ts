import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { buildMediaMasterDataItemPath } from "@/components/admin/content/MediaMasterDataManager";

describe("media master data admin pages", () => {
  it("builds item API paths from a serializable prefix", () => {
    assert.equal(
      buildMediaMasterDataItemPath("/api/content/media-libraries", "ml_product"),
      "/api/content/media-libraries/ml_product",
    );
    assert.equal(
      buildMediaMasterDataItemPath("/api/content/media-roles/", "mr_hero"),
      "/api/content/media-roles/mr_hero",
    );
  });

  it("does not pass function props from server pages into the client manager", () => {
    const librariesPage = readFileSync(
      "src/app/(backend)/admin/content/media-libraries/page.tsx",
      "utf8",
    );
    const rolesPage = readFileSync(
      "src/app/(backend)/admin/content/media-roles/page.tsx",
      "utf8",
    );

    assert.match(librariesPage, /itemPathPrefix="\/api\/content\/media-libraries"/);
    assert.match(rolesPage, /itemPathPrefix="\/api\/content\/media-roles"/);
    assert.doesNotMatch(librariesPage, /itemPath=\{/);
    assert.doesNotMatch(rolesPage, /itemPath=\{/);
  });
});
