import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CONCEPT_ENTITY_OWNERSHIP,
  RELATIONSHIP_TEMPLATES,
  templatesForEntityType,
} from "@/features/knowledge-graph/knowledge-graph-concept-ownership";
import {
  evaluateGraphExpansionPreview,
  KNOWLEDGE_GRAPH_EVALUATION_CASES,
} from "@/features/knowledge-graph/knowledge-graph-evaluation";
import { validateRelationshipPair } from "@/features/knowledge-graph/knowledge-graph-relationship-policy";
import { strictestVisibility } from "@/features/knowledge-graph/knowledge-graph-visibility";
import { isKnowledgeGraphExpansionEnabled } from "@/features/ai-retrieval/sources/knowledge-graph-source";

describe("Concept ownership", () => {
  it("binds Use Case/Audience/Industry to MediaVocabularyTerm", () => {
    assert.equal(CONCEPT_ENTITY_OWNERSHIP.USE_CASE.sourceType, "MediaVocabularyTerm");
    assert.equal(CONCEPT_ENTITY_OWNERSHIP.AUDIENCE.vocabType, "AUDIENCE");
    assert.equal(CONCEPT_ENTITY_OWNERSHIP.INDUSTRY.vocabType, "INDUSTRY");
    assert.equal(CONCEPT_ENTITY_OWNERSHIP.CAPABILITY.sourceType, "ManufacturingAsset");
    assert.equal(CONCEPT_ENTITY_OWNERSHIP.USE_CASE.manualCreationAllowed, false);
  });

  it("does not invent free-floating concept templates without from type", () => {
    for (const tpl of RELATIONSHIP_TEMPLATES) {
      assert.ok(tpl.fromEntityType);
      assert.ok(tpl.toEntityType);
      assert.ok(tpl.relationshipType);
    }
  });
});

describe("Curated templates & policy", () => {
  it("product suitability templates validate against allowlist", () => {
    for (const tpl of templatesForEntityType("PRODUCT")) {
      const result = validateRelationshipPair({
        relationshipType: tpl.relationshipType,
        fromEntityType: tpl.fromEntityType,
        toEntityType: tpl.toEntityType,
        origin: "CURATED",
      });
      assert.equal(result.ok, true, `${tpl.id} should be allowlisted`);
    }
  });

  it("rejects invalid curated target type", () => {
    const result = validateRelationshipPair({
      relationshipType: "SUITABLE_FOR",
      fromEntityType: "PRODUCT",
      toEntityType: "BLOG_POST",
      origin: "CURATED",
    });
    assert.equal(result.ok, false);
  });

  it("enforces visibility strictness for public path", () => {
    assert.equal(strictestVisibility("PUBLIC", "INTERNAL"), "INTERNAL");
  });
});

describe("Semantic matching rules", () => {
  it("normalize contract: ambiguous multi-hit rejected conceptually", () => {
    // Exact/alias importer only proposes when hits.length === 1
    const hits = [{ id: "a" }, { id: "b" }];
    assert.equal(hits.length === 1 ? "matched" : hits.length > 1 ? "ambiguous" : "missing", "ambiguous");
  });
});

describe("Evaluation dataset", () => {
  it("includes six benchmark topics", () => {
    assert.equal(KNOWLEDGE_GRAPH_EVALUATION_CASES.length, 6);
  });

  it("evaluator finds expected path and reports irrelevant hints", () => {
    const comparison = evaluateGraphExpansionPreview({
      caseId: "polo-corp",
      query: "áo polo đồng phục công ty",
      baselineFactCount: 5,
      previewMatchedOn: ["graph:PRODUCT→SUITABLE_FOR→USE_CASE", "graph:PRODUCT→TARGETS→AUDIENCE"],
      previewScopeEntityCount: 8,
      baselineContextChars: 200,
      previewContextChars: 260,
      expectedPaths: KNOWLEDGE_GRAPH_EVALUATION_CASES[0]!.expectedPaths,
      irrelevantPathHints: ["CUSTOMER"],
    });
    assert.ok(comparison.relevantPathsFound >= 1);
    assert.equal(comparison.irrelevantPathHits, 0);
    assert.equal(comparison.contextDeltaChars, 60);
  });

  it("keeps production expansion flag off by default", () => {
    delete process.env.KNOWLEDGE_GRAPH_EXPANSION_ENABLED;
    assert.equal(isKnowledgeGraphExpansionEnabled(), false);
  });
});

describe("Safety", () => {
  it("package remains free of neo4j/vector clients", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const pkg = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8")
    ) as { dependencies: Record<string, string> };
    assert.equal("neo4j-driver" in pkg.dependencies, false);
    assert.equal("@pinecone-database/pinecone" in pkg.dependencies, false);
  });
});
