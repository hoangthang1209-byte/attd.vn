import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getAiRetrievalPolicy,
  isPurposeAllowed,
  isSourceTypeAllowed,
  resolveEffectiveMaxVisibility,
} from "@/features/ai-retrieval/ai-retrieval-policy";
import { validateAiRetrievalRequest } from "@/features/ai-retrieval/ai-retrieval-validation";
import {
  detectFactConflicts,
  getAuthorityRank,
  suppressLowerAuthorityDuplicates,
} from "@/features/ai-retrieval/ai-authority";
import { calculateKnowledgeStaleness } from "@/features/ai-retrieval/ai-retrieval-staleness";
import { extractBusinessRulesFromKnowledge } from "@/features/ai-retrieval/ai-retrieval-business-rules";
import { scoreFactRelevance, sortFactsByScore } from "@/features/ai-retrieval/ai-retrieval-scoring";
import { buildAiRetrievalContextParts } from "@/features/ai-retrieval/services/ai-context-builder.service";
import type { AiRetrievedFact } from "@/features/ai-retrieval/ai-retrieval-types";
import { AiRetrievalConsumerNotEnabledError } from "@/features/ai-retrieval/ai-retrieval-errors";

function fact(overrides: Partial<AiRetrievedFact> & Pick<AiRetrievedFact, "id" | "sourceType" | "sourceId" | "title">): AiRetrievedFact {
  return {
    summary: null,
    content: null,
    structuredData: null,
    visibility: "PUBLIC",
    publicOutputAllowed: true,
    claimStatus: "FACT",
    confidence: 0.9,
    authorityRank: 50,
    stale: false,
    matchedOn: [],
    relevanceScore: 10,
    warnings: [],
    ...overrides,
  };
}

describe("AI retrieval policies", () => {
  it("SEO public output max visibility is PUBLIC", () => {
    const policy = getAiRetrievalPolicy("SEO_CONTENT");
    assert.equal(resolveEffectiveMaxVisibility(policy, "PUBLIC_OUTPUT"), "PUBLIC");
    assert.equal(policy.allowConfidential, false);
  });

  it("ADMIN may access CONFIDENTIAL", () => {
    assert.equal(getAiRetrievalPolicy("ADMIN").maxVisibility, "CONFIDENTIAL");
    assert.equal(getAiRetrievalPolicy("ADMIN").allowConfidential, true);
  });

  it("rejects caller visibility override", () => {
    const result = validateAiRetrievalRequest({
      consumer: "SEO_CONTENT",
      purpose: "PUBLIC_OUTPUT",
      query: "moq",
      allowConfidential: true,
    });
    assert.equal(result.ok, false);
  });

  it("rejects unsupported consumer/purpose", () => {
    const result = validateAiRetrievalRequest({
      consumer: "SEO_CONTENT",
      purpose: "QUOTATION",
      query: "moq",
    });
    assert.equal(result.ok, false);
  });

  it("rejects disallowed source type", () => {
    const policy = getAiRetrievalPolicy("SEO_CONTENT");
    assert.equal(isSourceTypeAllowed(policy, "CUSTOMER"), false);
    const result = validateAiRetrievalRequest({
      consumer: "SEO_CONTENT",
      purpose: "PUBLIC_OUTPUT",
      query: "moq",
      sourceTypes: ["CUSTOMER"],
    });
    assert.equal(result.ok, false);
  });

  it("rejects disabled consumer", () => {
    const result = validateAiRetrievalRequest({
      consumer: "SALES_COPILOT",
      purpose: "SALES_RESPONSE",
      query: "moq",
    });
    assert.equal(result.ok, false);
  });

  it("rejects arbitrary SQL/table access", () => {
    const result = validateAiRetrievalRequest({
      consumer: "ADMIN",
      purpose: "RESEARCH",
      query: "x",
      sql: "select * from Product",
    });
    assert.equal(result.ok, false);
  });
});

describe("AI retrieval claims", () => {
  it("SEO policy only allows FACT and VERIFIED_CLAIM", () => {
    const policy = getAiRetrievalPolicy("SEO_CONTENT");
    assert.deepEqual(policy.allowedClaimStatuses, ["FACT", "VERIFIED_CLAIM"]);
  });

  it("purpose allowlist works", () => {
    assert.equal(isPurposeAllowed(getAiRetrievalPolicy("SEO_BRIEF"), "CONTENT_PLANNING"), true);
    assert.equal(isPurposeAllowed(getAiRetrievalPolicy("SEO_BRIEF"), "QUOTATION"), false);
  });
});

describe("AI retrieval authority", () => {
  it("Product MOQ outranks general KB", () => {
    assert.ok(getAuthorityRank("PRODUCT", "moq") > getAuthorityRank("KNOWLEDGE_BASE", "moq"));
  });

  it("Variant/product lead time authority exceeds general KB", () => {
    assert.ok(getAuthorityRank("PRODUCT", "lead_time") > getAuthorityRank("KNOWLEDGE_BASE", "lead_time"));
  });

  it("Pricing policy outranks KB pricing guidance", () => {
    assert.ok(
      getAuthorityRank("PRICING_POLICY", "pricing_policy") >
        getAuthorityRank("KNOWLEDGE_BASE", "pricing_policy")
    );
  });

  it("suppresses lower-authority duplicates after conflict resolution", () => {
    const facts = [
      fact({
        id: "p1",
        sourceType: "PRODUCT",
        sourceId: "prod1",
        title: "Product MOQ",
        authorityRank: 100,
        structuredData: { moqValue: 10 },
      }),
      fact({
        id: "k1",
        sourceType: "KNOWLEDGE_BASE",
        sourceId: "kb1",
        title: "KB MOQ",
        authorityRank: 40,
        structuredData: { moqValue: 50 },
      }),
    ];
    const conflicts = detectFactConflicts(facts);
    assert.ok(conflicts.length >= 1);
    const suppressed = suppressLowerAuthorityDuplicates(facts, conflicts);
    assert.equal(suppressed.facts.some((f) => f.id === "k1"), false);
    assert.equal(suppressed.facts.some((f) => f.id === "p1"), true);
  });
});

describe("AI retrieval conflicts", () => {
  it("detects structured MOQ conflicts", () => {
    const conflicts = detectFactConflicts([
      fact({
        id: "a",
        sourceType: "PRODUCT",
        sourceId: "1",
        title: "A",
        authorityRank: 100,
        structuredData: { moqValue: 10 },
      }),
      fact({
        id: "b",
        sourceType: "KNOWLEDGE_BASE",
        sourceId: "2",
        title: "B",
        authorityRank: 40,
        structuredData: { moqValue: 100 },
      }),
    ]);
    assert.equal(conflicts[0]?.key, "MOQ");
    assert.equal(conflicts[0]?.resolution, "HIGHER_AUTHORITY_SELECTED");
    assert.equal(conflicts[0]?.selectedFactId, "a");
  });

  it("marks equal-authority conflicts unresolved", () => {
    const conflicts = detectFactConflicts([
      fact({
        id: "a",
        sourceType: "KNOWLEDGE_BASE",
        sourceId: "1",
        title: "A",
        authorityRank: 50,
        structuredData: { moqValue: 10 },
      }),
      fact({
        id: "b",
        sourceType: "KNOWLEDGE_BASE",
        sourceId: "2",
        title: "B",
        authorityRank: 50,
        structuredData: { moqValue: 20 },
      }),
    ]);
    assert.equal(conflicts[0]?.resolution, "UNRESOLVED");
  });
});

describe("AI retrieval staleness", () => {
  it("expired entry is stale", () => {
    const status = calculateKnowledgeStaleness({
      expiresAt: "2020-01-01T00:00:00.000Z",
      now: new Date("2026-07-14T00:00:00.000Z"),
    });
    assert.equal(status.stale, true);
    assert.equal(status.expired, true);
  });

  it("review-due when nextReviewAt past", () => {
    const status = calculateKnowledgeStaleness({
      nextReviewAt: "2020-01-01T00:00:00.000Z",
      now: new Date("2026-07-14T00:00:00.000Z"),
    });
    assert.equal(status.reviewDue, true);
  });

  it("fresh verified ranks higher than stale equivalent", () => {
    const fresh = fact({
      id: "fresh",
      sourceType: "KNOWLEDGE_BASE",
      sourceId: "1",
      title: "MOQ",
      lastVerifiedAt: new Date().toISOString(),
      stale: false,
      relevanceScore: 10,
      authorityRank: 50,
    });
    const stale = fact({
      id: "stale",
      sourceType: "KNOWLEDGE_BASE",
      sourceId: "2",
      title: "MOQ",
      stale: true,
      relevanceScore: 10,
      authorityRank: 50,
    });
    const scoredFresh = scoreFactRelevance(fresh, "moq");
    const scoredStale = scoreFactRelevance(stale, "moq");
    assert.ok(scoredFresh.score > scoredStale.score);
    const ordered = sortFactsByScore([
      { ...stale, relevanceScore: scoredStale.score },
      { ...fresh, relevanceScore: scoredFresh.score },
    ]);
    assert.equal(ordered[0].id, "fresh");
  });
});

describe("AI retrieval business rules + context", () => {
  it("extracts rules only from structured keys", () => {
    const rules = extractBusinessRulesFromKnowledge([
      {
        id: "1",
        title: "OEM MOQ",
        visibility: "PUBLIC",
        approvedAt: "2026-01-01",
        structuredData: { moqValue: 300, appliesTo: ["OEM"] },
      },
      {
        id: "2",
        title: "Free text only",
        visibility: "PUBLIC",
        structuredData: { notes: "something" },
      },
    ]);
    assert.equal(rules.length, 1);
    assert.equal(rules[0].outcome.moqValue, 300);
  });

  it("enforces context character limit", () => {
    const built = buildAiRetrievalContextParts({
      requestId: "r1",
      consumer: "SEO_CONTENT",
      purpose: "PUBLIC_OUTPUT",
      query: "test",
      facts: [
        fact({
          id: "1",
          sourceType: "PRODUCT",
          sourceId: "p",
          title: "X",
          content: "y".repeat(5000),
          summary: "z".repeat(2000),
        }),
      ],
      businessRules: [],
      conflicts: [],
      warnings: [],
      omitted: [],
      maxContextCharacters: 800,
    });
    assert.ok(built.contextText.length <= 800);
  });

  it("source manifest is accurate", () => {
    const built = buildAiRetrievalContextParts({
      requestId: "r1",
      consumer: "ADMIN",
      purpose: "RESEARCH",
      query: "q",
      facts: [
        fact({ id: "1", sourceType: "PRODUCT", sourceId: "p1", title: "P" }),
        fact({ id: "2", sourceType: "KNOWLEDGE_BASE", sourceId: "k1", title: "K" }),
      ],
      businessRules: [],
      conflicts: [],
      warnings: [],
      omitted: [],
      maxContextCharacters: 5000,
    });
    assert.equal(built.sourceManifest.length, 2);
    assert.equal(built.sourceManifest[0].sourceId, "p1");
  });
});

describe("AI retrieval safety contracts", () => {
  it("disabled consumers throw a clear not-enabled error type", () => {
    const err = new AiRetrievalConsumerNotEnabledError("MANUFACTURING_ASSISTANT");
    assert.equal(err.name, "AiRetrievalConsumerNotEnabledError");
    assert.match(err.message, /not enabled/);
  });

  it("validation requires query or entity scope", () => {
    const result = validateAiRetrievalRequest({
      consumer: "INTERNAL_SEARCH",
      purpose: "RESEARCH",
      query: "",
    });
    assert.equal(result.ok, false);
  });
});
