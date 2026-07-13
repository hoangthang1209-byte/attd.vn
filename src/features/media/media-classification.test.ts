import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  deriveMediaOrientation,
  normalizeMediaKeywords,
  normalizeMediaTags,
  resolveDefaultLibraryCodeFromLegacyFolder,
  resolveDefaultRoleCodeFromLegacyUsage,
  resolveLegacyFolderFromLibraryCode,
  resolveLegacyUsageTypeFromRoleCode,
  MEDIA_DISCOVERY_PRESETS,
  MEDIA_DISCOVERY_MAX_LIMIT,
} from "@/features/media/media-classification";

describe("media classification compatibility", () => {
  it("maps legacy folder to library codes", () => {
    assert.equal(resolveDefaultLibraryCodeFromLegacyFolder("PRODUCTS"), "PRODUCT");
    assert.equal(resolveDefaultLibraryCodeFromLegacyFolder("CATEGORIES"), "PRODUCT");
    assert.equal(resolveDefaultLibraryCodeFromLegacyFolder("CLIENTS"), "CUSTOMER");
    assert.equal(resolveDefaultLibraryCodeFromLegacyFolder("CASE_STUDIES"), "CASE_STUDY");
    assert.equal(resolveDefaultLibraryCodeFromLegacyFolder("BRANDING"), "BRANDING");
    assert.equal(resolveDefaultLibraryCodeFromLegacyFolder("BLOG"), "BLOG");
    assert.equal(resolveDefaultLibraryCodeFromLegacyFolder("GENERAL"), "GENERAL");
  });

  it("maps legacy usageType to role codes", () => {
    assert.equal(resolveDefaultRoleCodeFromLegacyUsage("PRODUCT"), "PRODUCT_MAIN");
    assert.equal(resolveDefaultRoleCodeFromLegacyUsage("BLOG"), "FEATURED");
    assert.equal(resolveDefaultRoleCodeFromLegacyUsage("KNOWLEDGE_BASE"), "DOCUMENTATION");
    assert.equal(resolveDefaultRoleCodeFromLegacyUsage("GENERAL"), "GENERAL");
  });

  it("maps library codes to compatible legacy folders", () => {
    assert.equal(resolveLegacyFolderFromLibraryCode("PRODUCT"), "PRODUCTS");
    assert.equal(resolveLegacyFolderFromLibraryCode("CUSTOMER"), "CLIENTS");
    assert.equal(resolveLegacyFolderFromLibraryCode("CASE_STUDY"), "CASE_STUDIES");
    assert.equal(resolveLegacyFolderFromLibraryCode("MANUFACTURING"), "GENERAL");
    assert.equal(resolveLegacyFolderFromLibraryCode("TECH_PACK"), "GENERAL");
  });

  it("maps role codes to compatible legacy usage types", () => {
    assert.equal(resolveLegacyUsageTypeFromRoleCode("PRODUCT_MAIN"), "PRODUCT");
    assert.equal(resolveLegacyUsageTypeFromRoleCode("FEATURED"), "BLOG");
    assert.equal(resolveLegacyUsageTypeFromRoleCode("DOCUMENTATION"), "KNOWLEDGE_BASE");
    assert.equal(resolveLegacyUsageTypeFromRoleCode("FACTORY"), "GENERAL");
  });

  it("derives orientation from dimensions", () => {
    assert.equal(deriveMediaOrientation(100, 100), "SQUARE");
    assert.equal(deriveMediaOrientation(200, 100), "LANDSCAPE");
    assert.equal(deriveMediaOrientation(100, 200), "PORTRAIT");
    assert.equal(deriveMediaOrientation(null, 100), "UNKNOWN");
    assert.equal(deriveMediaOrientation(100, undefined), "UNKNOWN");
  });

  it("normalizes tags and keywords case-insensitively with first-entry order", () => {
    assert.deepEqual(normalizeMediaTags([" Áo ", "áo", "Xuong", "", "Xuong"]), ["Áo", "Xuong"]);
    assert.deepEqual(normalizeMediaKeywords([" SEO ", "seo", "xưởng"]), ["SEO", "xưởng"]);
  });

  it("exposes discovery presets and max limit 50", () => {
    assert.ok(MEDIA_DISCOVERY_PRESETS.featuredArticle.roles.includes("FEATURED"));
    assert.ok(MEDIA_DISCOVERY_PRESETS.manufacturingContent.libraries.includes("MANUFACTURING"));
    assert.equal(MEDIA_DISCOVERY_MAX_LIMIT, 50);
  });
});
