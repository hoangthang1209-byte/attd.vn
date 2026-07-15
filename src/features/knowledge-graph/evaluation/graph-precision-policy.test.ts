import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  resolveGraphQueryIntent,
  resolveAllowedRelationshipsForExpansion,
  getRelationshipValueClass,
  GRAPH_PATH_POLICY_VERSION,
} from "@/features/knowledge-graph/evaluation/graph-expansion-path-policy";
import {
  pruneGraphPaths,
  applySourceScopeBudgets,
  type RawGraphPath,
} from "@/features/knowledge-graph/evaluation/graph-path-pruning";
import {
  resolveRelationQualityTier,
  getSourceBudgets,
  GRAPH_CONTEXT_GROWTH,
} from "@/features/knowledge-graph/evaluation/graph-expansion-budgets";
import { applyGraphAddedFactBudget } from "@/features/ai-retrieval/sources/knowledge-graph-source";
import { validateAiRetrievalRequest } from "@/features/ai-retrieval/ai-retrieval-validation";
import { isKnowledgeGraphExpansionEnabled } from "@/features/ai-retrieval/sources/knowledge-graph-source";
import { SPRINT_12_2_FAILURE_MAP } from "@/features/knowledge-graph/evaluation/graph-12-2-failure-map";

function samplePath(partial: Partial<RawGraphPath> & Pick<RawGraphPath, "endpointEntityType" | "endpointSourceType" | "relationshipTypes">): RawGraphPath {
  return {
    rootEntityId: "root",
    pathEntityIds: ["root", "end"],
    relationshipIds: ["e1"],
    edgeOrigins: ["CURATED"],
    evidenceUrls: ["https://example.com"],
    confidences: [90],
    fromTypes: ["PRODUCT"],
    toTypes: [partial.endpointEntityType],
    endpointSourceId: "x",
    endpointVisibility: "PUBLIC",
    matchedOn: ["graph:PRODUCT→X→Y"],
    hop: 1,
    ...partial,
  };
}

describe("Path policies", () => {
  it("classifies BELONGS_TO as noisy by default", () => {
    assert.equal(getRelationshipValueClass("BELONGS_TO"), "NOISY_BY_DEFAULT");
  });

  it("excludes BELONGS_TO from planner expansion allowlist", () => {
    const allowed = resolveAllowedRelationshipsForExpansion({
      consumer: "SEO_TOPIC_PLANNER",
      intent: "PRODUCT_COMMERCIAL",
    });
    assert.equal(allowed.includes("BELONGS_TO"), false);
    assert.ok(allowed.includes("SUITABLE_FOR"));
  });

  it("consumer allowlists differ", () => {
    const planner = resolveAllowedRelationshipsForExpansion({
      consumer: "SEO_TOPIC_PLANNER",
      intent: "GENERAL",
    });
    const brief = resolveAllowedRelationshipsForExpansion({
      consumer: "SEO_BRIEF",
      intent: "GENERAL",
    });
    assert.ok(brief.includes("COMPATIBLE_WITH"));
    assert.equal(planner.includes("COMPATIBLE_WITH"), false);
  });

  it("prunes RELATED_TO and taxonomy edges", () => {
    const pruned = pruneGraphPaths({
      paths: [
        samplePath({
          relationshipTypes: ["RELATED_TO"],
          endpointEntityType: "BLOG_POST",
          endpointSourceType: "BlogPost",
        }),
        samplePath({
          relationshipTypes: ["BELONGS_TO"],
          endpointEntityType: "PRODUCT_CATEGORY",
          endpointSourceType: "Category",
        }),
        samplePath({
          relationshipTypes: ["SUITABLE_FOR"],
          endpointEntityType: "USE_CASE",
          endpointSourceType: "MediaVocabularyTerm",
          evidenceUrls: ["https://e"],
        }),
      ],
      consumer: "SEO_TOPIC_PLANNER",
      intent: "PRODUCT_COMMERCIAL",
      maxVisibility: "PUBLIC",
      baselineSourceKeys: new Set(),
    });
    assert.ok(pruned.rejected.some((r) => r.reason === "related_to_chain"));
    assert.ok(pruned.rejected.some((r) => r.reason === "noisy_taxonomy"));
    assert.equal(pruned.accepted.length, 1);
  });

  it("prefers evidence-backed tier", () => {
    assert.equal(
      resolveRelationQualityTier({
        origin: "CURATED",
        relationshipType: "SUITABLE_FOR",
        evidenceUrl: "https://x",
        confidence: 90,
      }),
      "TIER_1"
    );
  });
});

describe("Intent & roots", () => {
  it("resolves technique intent for in lụa", () => {
    assert.equal(
      resolveGraphQueryIntent({ query: "in lụa số lượng lớn", consumer: "SEO_BRIEF" }),
      "TECHNIQUE"
    );
  });

  it("excludes use-case expansion on technique intent", () => {
    const allowed = resolveAllowedRelationshipsForExpansion({
      consumer: "SEO_BRIEF",
      intent: "TECHNIQUE",
    });
    assert.equal(allowed.includes("SUITABLE_FOR"), false);
    assert.ok(allowed.includes("SUPPORTS"));
  });

  it("prunes cross-intent use-case endpoints for technique", () => {
    const pruned = pruneGraphPaths({
      paths: [
        samplePath({
          relationshipTypes: ["HAS_CAPABILITY"],
          endpointEntityType: "CAPABILITY",
          endpointSourceType: "ManufacturingAsset",
        }),
        samplePath({
          relationshipTypes: ["SUITABLE_FOR"],
          endpointEntityType: "USE_CASE",
          endpointSourceType: "MediaVocabularyTerm",
        }),
      ],
      consumer: "SEO_BRIEF",
      intent: "TECHNIQUE",
      maxVisibility: "PUBLIC",
      baselineSourceKeys: new Set(),
    });
    assert.ok(pruned.rejected.some((r) => r.reason === "cross_intent_noise"));
  });
});

describe("Budgets", () => {
  it("enforces per-source budget including zero categories", () => {
    const budgets = getSourceBudgets("SEO_TOPIC_PLANNER");
    assert.equal(budgets.ProductCategory, 0);
    const paths: RawGraphPath[] = [
      samplePath({
        relationshipTypes: ["SUITABLE_FOR"],
        endpointEntityType: "USE_CASE",
        endpointSourceType: "MediaVocabularyTerm",
        endpointSourceId: "a",
      }),
      samplePath({
        relationshipTypes: ["SUITABLE_FOR"],
        endpointEntityType: "USE_CASE",
        endpointSourceType: "MediaVocabularyTerm",
        endpointSourceId: "b",
      }),
    ];
    const result = applySourceScopeBudgets({
      paths: paths.map((p, i) => ({ ...p, tier: "TIER_1" as const, endpointSourceId: `id${i}` })),
      consumer: "SEO_TOPIC_PLANNER",
      budgets: { MediaVocabularyTerm: 1, Other: 0 },
    });
    assert.equal(result.accepted.length, 1);
    assert.equal(result.droppedByBudget.length, 1);
  });

  it("preserves baseline facts in added-fact budget", () => {
    const { facts, report } = applyGraphAddedFactBudget({
      baselineFactIds: new Set(["b1"]),
      consumer: "SEO_BRIEF",
      facts: [
        {
          id: "b1",
          sourceType: "PRODUCT",
          sourceId: "p1",
          title: "base",
          visibility: "PUBLIC",
          publicOutputAllowed: true,
          authorityRank: 90,
          stale: false,
          matchedOn: [],
          relevanceScore: 50,
          warnings: [],
        },
        {
          id: "g1",
          sourceType: "KNOWLEDGE_BASE",
          sourceId: "k1",
          title: "graph",
          visibility: "PUBLIC",
          publicOutputAllowed: true,
          authorityRank: 40,
          stale: false,
          matchedOn: ["graph"],
          relevanceScore: 20,
          warnings: ["graph_scope_enrichment_only"],
        },
      ],
    });
    assert.ok(facts.some((f) => f.id === "b1"));
    assert.equal(report.accepted, 1);
  });

  it("documents context growth caps", () => {
    assert.equal(GRAPH_CONTEXT_GROWTH.targetPercent, 30);
    assert.equal(GRAPH_CONTEXT_GROWTH.hardMaxPercent, 35);
  });
});

describe("Safety & diagnostics", () => {
  it("keeps expansion off and rejects admin pilot in request body", () => {
    delete process.env.KNOWLEDGE_GRAPH_EXPANSION_ENABLED;
    assert.equal(isKnowledgeGraphExpansionEnabled(), false);
    const result = validateAiRetrievalRequest({
      consumer: "SEO_BRIEF",
      purpose: "CONTENT_PLANNING",
      query: "test",
      productIds: ["p"],
      enabledForAdminPilot: true,
    });
    assert.equal(result.ok, false);
  });

  it("records sprint 12.2 failure map for six benchmarks", () => {
    assert.equal(SPRINT_12_2_FAILURE_MAP.length, 6);
    assert.ok(GRAPH_PATH_POLICY_VERSION.startsWith("12.4"));
  });
});
