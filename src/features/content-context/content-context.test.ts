import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getContentContextProfile,
  isContentContextPurpose,
} from "@/features/content-context/content-context-profiles";
import { evaluateContentContextBriefReadiness } from "@/features/content-context/services/content-context-readiness.service";
import { applyContentContextBudget, estimateTokensFromCharacters } from "@/features/content-context/services/content-context-budget.service";
import {
  convertRetrievalConflicts,
  dedupeContentContextFacts,
  filterPublicFactsOnly,
  normalizeRetrievalFact,
} from "@/features/content-context/services/content-context-normalize.service";
import {
  buildContentContextPackage,
  hashContentContextInput,
  type ContentContextBuildRecord,
  type ContentContextBuilderDeps,
} from "@/features/content-context/services/content-context-builder.service";
import type { AiRetrievalContext, AiRetrievedFact } from "@/features/ai-retrieval/ai-retrieval-types";
import type { ContentContextFact } from "@/features/content-context/content-context.types";

function fact(overrides: Partial<AiRetrievedFact> & Pick<AiRetrievedFact, "id" | "sourceType" | "sourceId" | "title">): AiRetrievedFact {
  return {
    summary: "Public capability summary",
    content: null,
    structuredData: null,
    visibility: "PUBLIC",
    publicOutputAllowed: true,
    claimStatus: "FACT",
    confidence: 0.9,
    authorityRank: 80,
    stale: false,
    matchedOn: ["primary"],
    relevanceScore: 10,
    warnings: [],
    ...overrides,
  };
}

function baseRetrieval(facts: AiRetrievedFact[]): AiRetrievalContext {
  return {
    requestId: "ret_1",
    consumer: "SEO_CONTENT",
    purpose: "CONTENT_WRITING",
    query: "ao thun oem",
    policy: {
      maxVisibility: "PUBLIC",
      allowConfidential: false,
      requireApproved: true,
      requireVerified: true,
      compatibilityMode: true,
    },
    facts,
    businessRules: [],
    conflicts: [],
    warnings: [],
    sourcesUsed: [{ sourceType: "PRODUCT", count: facts.length }],
    omitted: [{ reason: "confidential_filtered", count: 1 }],
    contextText: "ctx",
    contextJson: {},
    sourceManifest: facts.map((f) => ({
      factId: f.id,
      sourceType: f.sourceType,
      sourceId: f.sourceId,
      title: f.title,
      visibility: f.visibility,
    })),
    generatedAt: new Date().toISOString(),
  };
}

function memoryBuilds(): ContentContextBuilderDeps["builds"] & {
  rows: ContentContextBuildRecord[];
} {
  const rows: ContentContextBuildRecord[] = [];
  return {
    rows,
    async findCompletedByInputHash(topicId, purpose, inputHash) {
      return (
        rows.find(
          (r) =>
            r.topicId === topicId &&
            r.purpose === purpose &&
            r.inputHash === inputHash &&
            r.status === "COMPLETED",
        ) ?? null
      );
    },
    async createRunning(data) {
      const row: ContentContextBuildRecord = {
        id: `build_${rows.length + 1}`,
        topicId: data.topicId,
        briefId: data.briefId,
        purpose: data.purpose,
        status: "RUNNING",
        version: data.version,
        retrievalRequestId: null,
        inputHash: data.inputHash,
        packageHash: null,
        readinessScore: null,
        readinessErrors: null,
        readinessWarnings: null,
        sourceManifest: null,
        budgetSummary: null,
        packageJson: null,
        errorMessage: null,
        requestedBy: data.requestedBy,
        startedAt: new Date(),
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      rows.push(row);
      return row;
    },
    async markCompleted(id, data) {
      const row = rows.find((r) => r.id === id)!;
      Object.assign(row, {
        status: "COMPLETED",
        ...data,
        completedAt: new Date(),
        errorMessage: null,
      });
      return row;
    },
    async markFailed(id, errorMessage) {
      const row = rows.find((r) => r.id === id)!;
      row.status = "FAILED";
      row.errorMessage = errorMessage;
      row.completedAt = new Date();
      return row;
    },
    async supersedePreviousCompleted(topicId, purpose, exceptId) {
      let n = 0;
      for (const row of rows) {
        if (
          row.topicId === topicId &&
          row.purpose === purpose &&
          row.status === "COMPLETED" &&
          row.id !== exceptId
        ) {
          row.status = "SUPERSEDED";
          n += 1;
        }
      }
      return n;
    },
  };
}

describe("Content context profiles", () => {
  it("SEO_ARTICLE uses public SEO_CONTENT / CONTENT_WRITING", () => {
    const p = getContentContextProfile("SEO_ARTICLE");
    assert.equal(p.retrievalConsumer, "SEO_CONTENT");
    assert.equal(p.retrievalPurpose, "CONTENT_WRITING");
    assert.equal(p.publicOutputOnly, true);
  });

  it("Landing profile requires CTA", () => {
    assert.equal(getContentContextProfile("SEO_LANDING_PAGE").requireCta, true);
  });

  it("rejects unsupported purpose", () => {
    assert.equal(isContentContextPurpose("NOT_A_PURPOSE"), false);
  });
});

describe("Content context readiness", () => {
  const profile = getContentContextProfile("SEO_ARTICLE");

  it("missing topic blocks", () => {
    const r = evaluateContentContextBriefReadiness({
      topic: null,
      brief: null,
      profile,
      preview: false,
      factCount: 1,
      conflicts: [],
      missingFacts: [],
      hasConfidentialFacts: false,
      hasMediaBundle: true,
      mediaCoverageLow: false,
      internalLinkCount: 1,
      staleFactCount: 0,
      legacyFactCount: 0,
    });
    assert.equal(r.ready, false);
    assert.ok(r.errors.some((e) => /Topic missing/i.test(e)));
  });

  it("empty outline blocks production mode", () => {
    const r = evaluateContentContextBriefReadiness({
      topic: { id: "t1", primaryKeyword: "oem" },
      brief: { outline: [], approvedAt: new Date() },
      profile,
      preview: false,
      factCount: 2,
      conflicts: [],
      missingFacts: [],
      hasConfidentialFacts: false,
      hasMediaBundle: true,
      mediaCoverageLow: false,
      internalLinkCount: 0,
      staleFactCount: 0,
      legacyFactCount: 0,
    });
    assert.equal(r.ready, false);
  });

  it("preview mode warns for empty outline", () => {
    const r = evaluateContentContextBriefReadiness({
      topic: { id: "t1", primaryKeyword: "oem" },
      brief: { outline: [], approvedAt: null },
      profile,
      preview: true,
      factCount: 2,
      conflicts: [],
      missingFacts: [],
      hasConfidentialFacts: false,
      hasMediaBundle: false,
      mediaCoverageLow: true,
      internalLinkCount: 0,
      staleFactCount: 0,
      legacyFactCount: 0,
    });
    assert.ok(r.warnings.length > 0);
  });

  it("blocking conflict prevents ready", () => {
    const r = evaluateContentContextBriefReadiness({
      topic: { id: "t1", primaryKeyword: "oem" },
      brief: {
        outline: [{ level: "H2", heading: "A", sortOrder: 0 }],
        approvedAt: new Date(),
      },
      profile,
      preview: false,
      factCount: 2,
      conflicts: [
        {
          key: "moq",
          competingFacts: [],
          resolution: "UNRESOLVED",
          publicUseAllowed: false,
          warning: "conflict",
        },
      ],
      missingFacts: [],
      hasConfidentialFacts: false,
      hasMediaBundle: true,
      mediaCoverageLow: false,
      internalLinkCount: 1,
      staleFactCount: 0,
      legacyFactCount: 0,
    });
    assert.equal(r.ready, false);
  });
});

describe("Normalize / dedupe / budget", () => {
  it("public profiles reject confidential facts", () => {
    const normalized = normalizeRetrievalFact(
      fact({
        id: "f1",
        sourceType: "PRODUCT",
        sourceId: "p1",
        title: "secret",
        visibility: "CONFIDENTIAL",
        publicOutputAllowed: false,
      }),
      { primaryKeyword: "oem", relatedIds: new Set(), required: false },
    );
    assert.equal(normalized, null);
  });

  it("strips cost fields and prioritizes product over kb moq", () => {
    const product = normalizeRetrievalFact(
      fact({
        id: "fp",
        sourceType: "PRODUCT",
        sourceId: "p1",
        title: "Product MOQ",
        summary: "MOQ 100",
        structuredData: { moqValue: 100, costPrice: 9 },
        authorityRank: 90,
      }),
      { primaryKeyword: "moq", relatedIds: new Set(["p1"]), required: true },
    )!;
    const kb = normalizeRetrievalFact(
      fact({
        id: "fk",
        sourceType: "KNOWLEDGE_BASE",
        sourceId: "k1",
        title: "KB MOQ",
        summary: "MOQ 50",
        structuredData: { moq: 50 },
        authorityRank: 40,
      }),
      { primaryKeyword: "moq", relatedIds: new Set(), required: false },
    )!;
    assert.equal(product.structuredValue && "costPrice" in product.structuredValue, false);
    const deduped = dedupeContentContextFacts([kb, product]);
    assert.equal(deduped[0].factId, "fp");
  });

  it("enforces character budget while preserving required facts", () => {
    const facts: ContentContextFact[] = Array.from({ length: 20 }, (_, i) => ({
      factId: `f${i}`,
      statement: "x".repeat(200),
      sourceType: "KNOWLEDGE_BASE",
      sourceId: `s${i}`,
      sourceTitle: "t",
      authorityRank: 50,
      visibility: "PUBLIC",
      publicOutputAllowed: true,
      stale: false,
      required: i === 0,
      matchedOn: [],
      warnings: [],
      priorityScore: i === 0 ? 100 : 10 - i,
    }));
    const result = applyContentContextBudget({
      requestedMaxCharacters: 1200,
      facts,
      mediaAssets: [],
      internalLinks: [],
      fixedTextLength: 100,
      maxFacts: 20,
      maxMediaAssets: 5,
      maxInternalLinks: 5,
    });
    assert.ok(result.facts.some((f) => f.factId === "f0"));
    assert.ok(result.factsDropped > 0);
    assert.equal(estimateTokensFromCharacters(400), 100);
  });

  it("token estimate is deterministic", () => {
    assert.equal(estimateTokensFromCharacters(0), 0);
    assert.equal(estimateTokensFromCharacters(7), 2);
  });

  it("converts retrieval conflicts", () => {
    const conflicts = convertRetrievalConflicts([
      {
        key: "moq",
        domain: "sales",
        facts: [{ factId: "a", sourceType: "PRODUCT", value: 100, authorityRank: 90 }],
        resolution: "UNRESOLVED",
        warning: "unresolved",
      },
    ]);
    assert.equal(conflicts[0].publicUseAllowed, false);
  });

  it("filterPublicFactsOnly drops internal", () => {
    const keep = filterPublicFactsOnly([
      {
        factId: "1",
        statement: "a",
        sourceType: "PRODUCT",
        sourceId: "p",
        sourceTitle: "t",
        authorityRank: 1,
        visibility: "INTERNAL",
        publicOutputAllowed: true,
        stale: false,
        required: false,
        matchedOn: [],
        warnings: [],
        priorityScore: 1,
      },
    ]);
    assert.equal(keep.length, 0);
  });
});

describe("Content context builder", () => {
  it("uses retrieval only and caches by inputHash", async () => {
    let retrieveCalls = 0;
    const builds = memoryBuilds();
    const deps: ContentContextBuilderDeps = {
      async getTopic() {
        return {
          id: "topic1",
          title: "OEM áo thun",
          primaryKeyword: "ao thun oem",
          searchIntent: "COMMERCIAL",
          funnelStage: "MOFU",
          contentType: "BLOG_ARTICLE",
          targetAudience: ["buyer"],
          strategyId: "s1",
          clusterId: "c1",
          mediaBundleId: null,
          updatedAt: "2026-01-01T00:00:00.000Z",
          keywords: [{ keyword: "oem", keywordType: "SUPPORTING" }],
        };
      },
      async getBrief() {
        return {
          id: "brief1",
          workingTitle: "OEM guide",
          outline: [
            { level: "H2", heading: "MOQ", sortOrder: 0, required: true },
            { level: "H2", heading: "Quy trình", sortOrder: 1 },
          ],
          approvedAt: new Date("2026-01-01"),
          version: 2,
          updatedAt: "2026-01-01T00:00:00.000Z",
          ctaText: "Liên hệ báo giá",
          entities: [],
          requiredSections: [],
          schemaTypes: ["Article"],
        };
      },
      async retrieveContext() {
        retrieveCalls += 1;
        return baseRetrieval([
          fact({
            id: "f1",
            sourceType: "PRODUCT",
            sourceId: "p1",
            title: "Áo thun",
            summary: "OEM capability",
            authorityRank: 85,
            approvedAt: "2026-01-01",
          }),
          fact({
            id: "secret",
            sourceType: "KNOWLEDGE_BASE",
            sourceId: "k2",
            title: "Cost",
            visibility: "CONFIDENTIAL",
            publicOutputAllowed: false,
            summary: "cost 12",
            structuredData: { costPrice: 12 },
          }),
        ]);
      },
      async getMediaBundle() {
        return null;
      },
      async listInternalLinks() {
        return [
          {
            id: "l1",
            status: "ACCEPTED",
            anchorText: "Xem sản phẩm",
            context: "related",
            relevanceScore: 10,
            targetTopicId: "topic2",
            targetTitle: "Product page",
            targetUrl: "/san-pham/ao-thun",
          },
          {
            id: "bad",
            status: "SUGGESTED",
            anchorText: "evil",
            context: null,
            relevanceScore: 1,
            targetTopicId: "topic3",
            targetTitle: "x",
            targetUrl: "javascript:alert(1)",
          },
        ];
      },
      builds,
    };

    const first = await buildContentContextPackage(
      {
        topicId: "topic1",
        purpose: "SEO_ARTICLE",
        preview: true,
        includeSuggestedInternalLinks: true,
      },
      deps,
    );
    assert.equal(first.cacheHit, false);
    assert.equal(retrieveCalls, 1);
    assert.ok(first.package.facts.every((f) => f.visibility === "PUBLIC"));
    assert.ok(!first.package.facts.some((f) => f.factId === "secret"));
    assert.ok(first.package.prohibitedClaims.some((p) => p.key === "no_cost_margin"));
    assert.ok(first.package.internalLinks.every((l) => !l.url.startsWith("javascript:")));
    assert.ok(first.package.sourceManifest.length === first.package.facts.length);
    assert.match(first.package.contextText, /UNTRUSTED SOURCE DATA/);

    const second = await buildContentContextPackage(
      {
        topicId: "topic1",
        purpose: "SEO_ARTICLE",
        preview: true,
      },
      deps,
    );
    assert.equal(second.cacheHit, true);
    assert.equal(retrieveCalls, 1);
    assert.equal(second.buildId, first.buildId);

    const forced = await buildContentContextPackage(
      {
        topicId: "topic1",
        purpose: "SEO_ARTICLE",
        preview: true,
        forceRefreshRetrieval: true,
      },
      deps,
    );
    assert.equal(forced.cacheHit, false);
    assert.equal(retrieveCalls, 2);
    assert.ok(builds.rows.some((r) => r.status === "SUPERSEDED"));
  });

  it("inputHash changes when brief updates", () => {
    const a = hashContentContextInput({ briefVersion: 1 });
    const b = hashContentContextInput({ briefVersion: 2 });
    assert.notEqual(a, b);
  });
});
