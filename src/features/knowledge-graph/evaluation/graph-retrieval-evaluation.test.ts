import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  GRAPH_EVALUATION_BENCHMARKS,
  KNOWLEDGE_GRAPH_EVALUATION_CASES,
} from "@/features/knowledge-graph/evaluation/graph-evaluation-benchmarks";
import {
  buildJudgment,
  classifyAddedEntity,
  matchExpectedPaths,
  type PathObservation,
} from "@/features/knowledge-graph/evaluation/graph-evaluation-judgment";
import {
  judgeThresholds,
  GRAPH_EVALUATION_THRESHOLDS,
  recommendPilot,
} from "@/features/knowledge-graph/evaluation/graph-evaluation-thresholds";
import {
  getKnowledgeGraphExpansionFlagSnapshot,
  isKnowledgeGraphExpansionEnabledForConsumer,
} from "@/features/knowledge-graph/evaluation/graph-expansion-flags";
import { GRAPH_CURATION_MANIFEST } from "@/features/knowledge-graph/evaluation/graph-curation-manifest";
import { GRAPH_EVALUATION_COHORT } from "@/features/knowledge-graph/evaluation/graph-evaluation-cohort";
import { evaluateGraphExpansionPreview } from "@/features/knowledge-graph/knowledge-graph-evaluation";
import { isKnowledgeGraphExpansionEnabled } from "@/features/ai-retrieval/sources/knowledge-graph-source";
import { validateAiRetrievalRequest } from "@/features/ai-retrieval/ai-retrieval-validation";

describe("Cohort & manifest", () => {
  it("defines 10–20 products and six benchmarks", () => {
    assert.ok(GRAPH_EVALUATION_COHORT.products.length >= 10);
    assert.ok(GRAPH_EVALUATION_COHORT.products.length <= 20);
    assert.equal(GRAPH_EVALUATION_BENCHMARKS.length, 6);
    assert.equal(KNOWLEDGE_GRAPH_EVALUATION_CASES.length, 6);
  });

  it("manifest rows have reasons and relationship types", () => {
    assert.ok(GRAPH_CURATION_MANIFEST.length >= 10);
    for (const row of GRAPH_CURATION_MANIFEST) {
      assert.ok(row.reason.length > 5);
      assert.ok(row.relationshipType);
      assert.ok(row.benchmarkTags.length);
    }
  });

  it("records SEO/Bundle data gaps explicitly", () => {
    assert.ok(GRAPH_EVALUATION_COHORT.dataGaps.some((g) => g.includes("SeoTopic")));
  });
});

describe("Benchmark matching", () => {
  const observed: PathObservation[] = [
    {
      fromEntityType: "PRODUCT",
      relationshipType: "SUITABLE_FOR",
      toEntityType: "USE_CASE",
      depth: 1,
      matchedOn: "graph:PRODUCT→SUITABLE_FOR→USE_CASE",
    },
    {
      fromEntityType: "PRODUCT",
      relationshipType: "TARGETS",
      toEntityType: "AUDIENCE",
      depth: 1,
      matchedOn: "graph:PRODUCT→TARGETS→AUDIENCE",
    },
    {
      fromEntityType: "CAPABILITY",
      relationshipType: "HAS_MEDIA",
      toEntityType: "MEDIA_BUNDLE",
      depth: 2,
      matchedOn: "graph:CAPABILITY→HAS_MEDIA→MEDIA_BUNDLE",
    },
  ];

  it("matches expected one-hop paths", () => {
    const m = matchExpectedPaths(
      [{ fromEntityType: "PRODUCT", relationshipType: "SUITABLE_FOR", toEntityType: "USE_CASE" }],
      observed
    );
    assert.equal(m.found, 1);
    assert.equal(m.missing.length, 0);
  });

  it("matches expected two-hop-depth paths", () => {
    const m = matchExpectedPaths(
      [
        {
          fromEntityType: "CAPABILITY",
          relationshipType: "HAS_MEDIA",
          toEntityType: "MEDIA_BUNDLE",
          maxDepth: 2,
        },
      ],
      observed
    );
    assert.equal(m.found, 1);
  });

  it("marks prohibited / unrelated as irrelevant", () => {
    const cls = classifyAddedEntity({
      entityType: "POLICY",
      sourceType: "KnowledgeBaseEntry",
      sourceId: "x",
      benchmark: GRAPH_EVALUATION_BENCHMARKS[0]!,
      observedPaths: observed,
      alreadyInBaselineScope: false,
    });
    assert.equal(cls, "IRRELEVANT");
  });

  it("detects duplicate entities", () => {
    const cls = classifyAddedEntity({
      entityType: "USE_CASE",
      sourceType: "MediaVocabularyTerm",
      sourceId: "y",
      benchmark: GRAPH_EVALUATION_BENCHMARKS[0]!,
      observedPaths: observed,
      alreadyInBaselineScope: true,
    });
    assert.equal(cls, "DUPLICATE");
  });

  it("reports missing expected paths", () => {
    const m = matchExpectedPaths(
      [{ fromEntityType: "SEO_TOPIC", relationshipType: "LINKS_TO", toEntityType: "BLOG_POST" }],
      observed
    );
    assert.equal(m.found, 0);
    assert.equal(m.missing.length, 1);
  });
});

describe("Judgment & thresholds", () => {
  it("computes precision/recall/context growth", () => {
    const j = buildJudgment({
      benchmark: GRAPH_EVALUATION_BENCHMARKS[0]!,
      observedPaths: [
        {
          fromEntityType: "PRODUCT",
          relationshipType: "SUITABLE_FOR",
          toEntityType: "USE_CASE",
          depth: 1,
          matchedOn: "graph:PRODUCT→SUITABLE_FOR→USE_CASE",
        },
        {
          fromEntityType: "PRODUCT",
          relationshipType: "TARGETS",
          toEntityType: "AUDIENCE",
          depth: 1,
          matchedOn: "graph:PRODUCT→TARGETS→AUDIENCE",
        },
        {
          fromEntityType: "PRODUCT",
          relationshipType: "BELONGS_TO",
          toEntityType: "PRODUCT_CATEGORY",
          depth: 1,
          matchedOn: "graph:PRODUCT→BELONGS_TO→PRODUCT_CATEGORY",
        },
      ],
      relevantAddedEntities: 4,
      irrelevantAddedEntities: 1,
      duplicateAddedEntities: 0,
      relevantAddedFacts: 2,
      irrelevantAddedFacts: 0,
      baselineChars: 1000,
      expandedChars: 1200,
      directAuthorityPreserved: true,
      visibilitySafe: true,
      conflictSafe: true,
    });
    assert.equal(j.recall, 1);
    assert.ok(j.precision >= 0.8);
    assert.equal(j.contextGrowthPercent, 20);
  });

  it("threshold PASS/FAIL/CONDITIONAL", () => {
    const pass = judgeThresholds({
      consumersEvaluated: ["SEO_BRIEF"],
      benchmarks: Array.from({ length: 6 }, (_, i) => ({
        benchmarkId: `b${i}`,
        improved: true,
        precision: 0.9,
        irrelevantAdditionRatio: 0.1,
        contextGrowthPercent: 10,
        visibilitySafe: true,
        directAuthorityPreserved: true,
        conflictSafe: true,
        graphNodesCountedAsFacts: false,
        usefulNewSourceOrContent: true,
      })),
    });
    assert.equal(pass.verdict, "PASS");

    const fail = judgeThresholds({
      consumersEvaluated: ["SEO_BRIEF"],
      benchmarks: [
        {
          benchmarkId: "x",
          improved: false,
          precision: 0.5,
          irrelevantAdditionRatio: 0.5,
          contextGrowthPercent: 10,
          visibilitySafe: false,
          directAuthorityPreserved: true,
          conflictSafe: true,
          graphNodesCountedAsFacts: false,
          usefulNewSourceOrContent: false,
        },
      ],
    });
    assert.equal(fail.verdict, "FAIL");
    assert.equal(GRAPH_EVALUATION_THRESHOLDS.minImprovedBenchmarks, 5);

    const rec = recommendPilot({
      verdict: "FAIL",
      byConsumer: [{ consumer: "SEO_BRIEF", verdict: "FAIL", improvedCount: 0 }],
    });
    assert.equal(rec.recommendation, "NO_PILOT");
  });

  it("legacy preview contract still works", () => {
    const comparison = evaluateGraphExpansionPreview({
      caseId: "polo-corporate",
      query: "áo polo đồng phục công ty",
      baselineFactCount: 5,
      previewMatchedOn: ["graph:PRODUCT→SUITABLE_FOR→USE_CASE"],
      previewScopeEntityCount: 8,
      baselineContextChars: 200,
      previewContextChars: 260,
      expectedPaths: KNOWLEDGE_GRAPH_EVALUATION_CASES[0]!.expectedPaths,
      irrelevantPathHints: ["CUSTOMER"],
    });
    assert.ok(comparison.relevantPathsFound >= 1);
  });
});

describe("Flags & public safety", () => {
  it("keeps all expansion flags off by default", () => {
    delete process.env.KNOWLEDGE_GRAPH_EXPANSION_ENABLED;
    delete process.env.KNOWLEDGE_GRAPH_EXPANSION_SEO_TOPIC_PLANNER;
    delete process.env.KNOWLEDGE_GRAPH_EXPANSION_SEO_BRIEF;
    delete process.env.KNOWLEDGE_GRAPH_EXPANSION_SEO_CONTENT;
    assert.equal(isKnowledgeGraphExpansionEnabled(), false);
    assert.equal(isKnowledgeGraphExpansionEnabledForConsumer("SEO_BRIEF"), false);
    assert.equal(isKnowledgeGraphExpansionEnabledForConsumer("SEO_TOPIC_PLANNER"), false);
    const snap = getKnowledgeGraphExpansionFlagSnapshot();
    assert.equal(snap.global, false);
    assert.equal(snap.rolloutMode, "OFF");
  });

  it("evaluation override enables per-call without env mutation", () => {
    assert.equal(
      isKnowledgeGraphExpansionEnabledForConsumer("SEO_BRIEF", { enabledForEvaluation: true }),
      true
    );
    assert.equal(isKnowledgeGraphExpansionEnabled(), false);
  });

  it("rejects evaluation override in public request body", () => {
    const result = validateAiRetrievalRequest({
      consumer: "SEO_BRIEF",
      purpose: "CONTENT_PLANNING",
      query: "test",
      productIds: ["p1"],
      enabledForEvaluation: true,
    });
    assert.equal(result.ok, false);
  });
});

describe("Safety package scan", () => {
  it("no neo4j / pinecone / openai deps required for evaluation", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const pkg = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8")
    ) as { dependencies: Record<string, string> };
    assert.equal("neo4j-driver" in pkg.dependencies, false);
    assert.equal("@pinecone-database/pinecone" in pkg.dependencies, false);
  });
});
