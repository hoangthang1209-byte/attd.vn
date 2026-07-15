import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCanonicalGraphKey,
  sanitizeGraphMetadata,
} from "@/features/knowledge-graph/knowledge-graph-entity-registry";
import {
  getRelationshipPolicy,
  resolveRelationshipVisibility,
  validateRelationshipPair,
} from "@/features/knowledge-graph/knowledge-graph-relationship-policy";
import { strictestVisibility } from "@/features/knowledge-graph/knowledge-graph-visibility";
import {
  GRAPH_TRAVERSAL_LIMITS,
  GRAPH_SCORING_BONUSES,
} from "@/features/knowledge-graph/knowledge-graph-types";
import {
  isKnowledgeGraphExpansionEnabled,
  expandRetrievalScopeViaKnowledgeGraph,
} from "@/features/ai-retrieval/sources/knowledge-graph-source";
import {
  isRelationshipAllowedForConsumer,
  SEO_UNSAFE_RELATIONSHIP_TYPES,
} from "@/features/ai-retrieval/knowledge-graph-expansion-policy";
import { getAiRetrievalPolicy } from "@/features/ai-retrieval/ai-retrieval-policy";

describe("Knowledge Graph registry", () => {
  it("builds stable canonical keys", () => {
    assert.equal(
      buildCanonicalGraphKey("PRODUCT", "ao-thun-basic"),
      "product:ao-thun-basic"
    );
  });

  it("strips forbidden business metadata", () => {
    const cleaned = sanitizeGraphMetadata({
      slug: "x",
      moq: 50,
      defaultMoq: 10,
      price: 100,
      leadTime: "7d",
      status: "ACTIVE",
    });
    assert.deepEqual(cleaned, { slug: "x", status: "ACTIVE" });
    assert.equal(cleaned && "moq" in cleaned, false);
  });
});

describe("Knowledge Graph relationship policy", () => {
  it("allows PRODUCT MADE_FROM MATERIAL", () => {
    const result = validateRelationshipPair({
      relationshipType: "MADE_FROM",
      fromEntityType: "PRODUCT",
      toEntityType: "MATERIAL",
      origin: "SYSTEM_DERIVED",
    });
    assert.equal(result.ok, true);
  });

  it("rejects PRODUCT MADE_FROM BLOG_POST", () => {
    const result = validateRelationshipPair({
      relationshipType: "MADE_FROM",
      fromEntityType: "PRODUCT",
      toEntityType: "BLOG_POST",
      origin: "CURATED",
    });
    assert.equal(result.ok, false);
  });

  it("rejects free-form relationship types", () => {
    assert.equal(getRelationshipPolicy("FRIEND_OF"), null);
    const result = validateRelationshipPair({
      relationshipType: "FRIEND_OF",
      fromEntityType: "PRODUCT",
      toEntityType: "MATERIAL",
      origin: "CURATED",
    });
    assert.equal(result.ok, false);
  });

  it("rejects self-loops", () => {
    const result = validateRelationshipPair({
      relationshipType: "RELATED_TO",
      fromEntityType: "PRODUCT",
      toEntityType: "PRODUCT",
      origin: "CURATED",
      fromEntityId: "a",
      toEntityId: "a",
    });
    assert.equal(result.ok, false);
  });

  it("applies visibility strictness", () => {
    assert.equal(strictestVisibility("PUBLIC", "INTERNAL", "CONFIDENTIAL"), "CONFIDENTIAL");
    const policy = getRelationshipPolicy("SUITABLE_FOR");
    assert.ok(policy);
    const visibility = resolveRelationshipVisibility({
      policy,
      fromVisibility: "PUBLIC",
      toVisibility: "INTERNAL",
      override: "PUBLIC",
    });
    assert.equal(visibility, "INTERNAL");
  });
});

describe("Knowledge Graph traversal limits", () => {
  it("enforces bounded defaults", () => {
    assert.equal(GRAPH_TRAVERSAL_LIMITS.maxDepth, 2);
    assert.equal(GRAPH_TRAVERSAL_LIMITS.defaultDepth, 1);
    assert.equal(GRAPH_TRAVERSAL_LIMITS.maxNeighboursPerNode, 40);
    assert.equal(GRAPH_TRAVERSAL_LIMITS.maxTotalEntities, 100);
    assert.equal(GRAPH_TRAVERSAL_LIMITS.maxTotalEdges, 150);
  });

  it("keeps graph scoring bonuses below direct fact dominance", () => {
    assert.ok(GRAPH_SCORING_BONUSES.oneHop < 20);
    assert.ok(GRAPH_SCORING_BONUSES.twoHop < GRAPH_SCORING_BONUSES.oneHop);
  });
});

describe("Knowledge Graph retrieval integration (flag off)", () => {
  it("defaults expansion flag to false", () => {
    delete process.env.KNOWLEDGE_GRAPH_EXPANSION_ENABLED;
    assert.equal(isKnowledgeGraphExpansionEnabled(), false);
  });

  it("does not query graph when flag is off", async () => {
    delete process.env.KNOWLEDGE_GRAPH_EXPANSION_ENABLED;
    const policy = getAiRetrievalPolicy("SEO_CONTENT");
    const result = await expandRetrievalScopeViaKnowledgeGraph(
      {
        consumer: "SEO_CONTENT",
        purpose: "PUBLIC_OUTPUT",
        query: "polo",
        productIds: ["prod_1"],
      },
      policy
    );
    assert.equal(result.enabled, false);
    assert.equal(result.queried, false);
    assert.deepEqual(result.scopeEntityIds, []);
    assert.deepEqual(result.provenance, []);
  });

  it("excludes unsafe relationships from SEO policy", () => {
    for (const unsafe of SEO_UNSAFE_RELATIONSHIP_TYPES) {
      assert.equal(isRelationshipAllowedForConsumer("SEO_CONTENT", unsafe), false);
    }
    assert.equal(isRelationshipAllowedForConsumer("SEO_CONTENT", "BELONGS_TO"), true);
    assert.equal(isRelationshipAllowedForConsumer("SEO_CONTENT", "MADE_FROM"), true);
  });
});

describe("Knowledge Graph ownership safety", () => {
  it("does not reference Neo4j or vector search packages", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const pkg = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8")
    ) as { dependencies: Record<string, string>; devDependencies?: Record<string, string> };
    const all = { ...pkg.dependencies, ...pkg.devDependencies };
    assert.equal("neo4j-driver" in all, false);
    assert.equal("@neo4j/graphql" in all, false);
    assert.equal("@pinecone-database/pinecone" in all, false);
    assert.equal("chromadb" in all, false);
  });
});
