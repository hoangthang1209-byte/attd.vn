import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  filterEntriesByVisibility,
  getMaxVisibilityForAudience,
  inferVisibilityFromUsageScope,
  isVisibilityAllowedForAudience,
} from "@/features/knowledge-base/knowledge-base-visibility";
import {
  getClaimGovernanceWarnings,
  isClaimSafeForAiOutput,
  resolveClaimStatusOnVerify,
} from "@/features/knowledge-base/knowledge-base-claim-governance";
import {
  normalizeStructuredData,
  structuredDataCoveragePercent,
} from "@/features/knowledge-base/knowledge-base-structured-schema";
import { searchKnowledgeBase } from "@/features/knowledge-base/knowledge-base-search";
import { retrieveKnowledgeForAi } from "@/features/knowledge-base/knowledge-base-retrieval.service";
import type { KnowledgeBaseEntryRecord } from "@/features/knowledge-base/knowledge-base-types";

function mockEntry(overrides: Partial<KnowledgeBaseEntryRecord> = {}): KnowledgeBaseEntryRecord {
  return {
    id: "kb1",
    title: "MOQ áo thun",
    slug: "moq-ao-thun",
    summary: "Chính sách MOQ",
    content: "MOQ tối thiểu 10 sản phẩm",
    structuredData: { moqValue: 10, moqUnit: "sản phẩm" },
    categoryId: "cat1",
    type: "PRICING",
    status: "ACTIVE",
    priority: "HIGH",
    sourceId: null,
    tags: ["moq"],
    aliases: ["minimum order"],
    relatedProductIds: [],
    relatedLandingPageSlugs: [],
    relatedBlogPostIds: [],
    relatedMediaBundleIds: [],
    relatedSeoTopicIds: [],
    relatedEntryIds: [],
    usageScope: ["SALES"],
    visibility: "PUBLIC",
    claimStatus: "FACT",
    confidence: "HIGH",
    language: "vi",
    domain: "sales",
    ownerId: null,
    authorName: null,
    evidenceUrl: null,
    approvedBy: null,
    approvedAt: null,
    lastVerifiedAt: null,
    version: 1,
    isFeatured: false,
    isVerified: true,
    verifiedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("KB visibility model", () => {
  it("PUBLIC_AI cannot read CONFIDENTIAL", () => {
    assert.equal(isVisibilityAllowedForAudience("CONFIDENTIAL", "PUBLIC_AI"), false);
    assert.equal(isVisibilityAllowedForAudience("PUBLIC", "PUBLIC_AI"), true);
  });

  it("ADMIN can read all visibility levels", () => {
    assert.equal(getMaxVisibilityForAudience("ADMIN"), "CONFIDENTIAL");
    assert.equal(isVisibilityAllowedForAudience("CONFIDENTIAL", "ADMIN"), true);
  });

  it("infers PUBLIC from PUBLIC_FAQ usage scope", () => {
    assert.equal(inferVisibilityFromUsageScope(["PUBLIC_FAQ"]), "PUBLIC");
  });

  it("filters pool by audience", () => {
    const entries = [
      mockEntry({ id: "a", visibility: "PUBLIC" }),
      mockEntry({ id: "b", visibility: "CONFIDENTIAL" }),
    ];
    const filtered = filterEntriesByVisibility(entries, "PUBLIC_AI");
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].id, "a");
  });
});

describe("KB claim governance", () => {
  it("only FACT and VERIFIED_CLAIM are AI-safe", () => {
    assert.equal(isClaimSafeForAiOutput("FACT"), true);
    assert.equal(isClaimSafeForAiOutput("VERIFIED_CLAIM"), true);
    assert.equal(isClaimSafeForAiOutput("MARKETING_CLAIM"), false);
  });

  it("verification with evidence upgrades NEEDS_EVIDENCE", () => {
    assert.equal(
      resolveClaimStatusOnVerify({
        claimStatus: "NEEDS_EVIDENCE",
        evidenceUrl: "https://example.com/proof",
        isVerified: true,
      }),
      "VERIFIED_CLAIM"
    );
  });

  it("warns when marketing claim lacks evidence", () => {
    const warnings = getClaimGovernanceWarnings({
      claimStatus: "MARKETING_CLAIM",
      evidenceUrl: null,
      approvedBy: null,
      isVerified: false,
    });
    assert.ok(warnings.length > 0);
  });
});

describe("KB structured schema", () => {
  it("normalizes numeric and list fields", () => {
    const data = normalizeStructuredData({
      moqValue: "50",
      leadTimeMinDays: "7",
      printCompatibility: "Screen, DTG",
    });
    assert.equal(data?.moqValue, 50);
    assert.equal(data?.leadTimeMinDays, 7);
    assert.deepEqual(data?.printCompatibility, ["Screen", "DTG"]);
  });

  it("computes structured coverage from expected keys", () => {
    const pct = structuredDataCoveragePercent({ moqValue: 10, material: "cotton" }, [
      "moqValue",
      "material",
      "leadTime",
    ]);
    assert.equal(pct, 67);
  });
});

describe("KB search", () => {
  it("matches aliases and structured data", () => {
    const results = searchKnowledgeBase([mockEntry()], "minimum order");
    assert.equal(results.length, 1);
  });
});

describe("KB AI retrieval", () => {
  it("respects visibility and claim filters", () => {
    const entries = [
      mockEntry({ id: "ok" }),
      mockEntry({ id: "secret", visibility: "CONFIDENTIAL" }),
      mockEntry({ id: "marketing", claimStatus: "MARKETING_CLAIM" }),
    ];
    const result = retrieveKnowledgeForAi(entries, {
      query: "moq",
      audience: "PUBLIC_AI",
      claimSafeOnly: true,
    });
    assert.equal(result.items.length, 1);
    assert.equal(result.items[0].entry.id, "ok");
  });
});
